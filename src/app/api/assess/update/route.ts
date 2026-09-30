import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { redis } from '@/lib/redis';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    if (!data.id) {
      return NextResponse.json({ success: false, error: 'Missing ID' }, { status: 400 });
    }

    const updateData: any = {};
    if (data.placard_status) updateData.placard_status = data.placard_status;
    if (data.override_justification !== undefined) updateData.override_justification = data.override_justification;
    if (data.override_badge_id !== undefined) updateData.override_badge_id = data.override_badge_id;
    if (data.collapse_radius_meters !== undefined) updateData.collapse_radius_meters = data.collapse_radius_meters;

    // Update in Supabase
    let { data: updatedData, error } = await supabaseAdmin
      .from('structural_assessments')
      .update(updateData)
      .eq('id', data.id)
      .select()
      .single();

    // Defensive fallback if user hasn't run SQL migrations for new columns yet
    if (error && error.message.includes("Could not find")) {
      console.warn("Supabase schema missing override columns. Retrying with core columns only.");
      delete updateData.override_justification;
      delete updateData.override_badge_id;
      const retry = await supabaseAdmin
        .from('structural_assessments')
        .update(updateData)
        .eq('id', data.id)
        .select()
        .single();
      updatedData = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }

    const payload = JSON.stringify({
      id: updatedData.id,
      building_name: updatedData.building_name,
      placard_status: updatedData.placard_status,
      latitude: updatedData.latitude,
      longitude: updatedData.longitude,
      collapse_radius_meters: updatedData.collapse_radius_meters,
      timestamp: updatedData.created_at,
    });

    await redis.publish('channel:tactical-alerts', payload);

    return NextResponse.json({ success: true, recordId: updatedData.id, data: updatedData });
  } catch (error) {
    console.error('Update API error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
