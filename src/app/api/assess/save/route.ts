import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { redis } from '@/lib/redis';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // 1. Sanitize fields to prevent varchar length violations (e.g., structural_archetype is varchar(50))
    const sanitizedData = {
      ...data,
      structural_archetype: data.structural_archetype ? data.structural_archetype.substring(0, 49) : 'Unknown',
      building_name: data.building_name ? data.building_name.substring(0, 49) : 'Unknown',
    };

    // 2. Insert into Supabase
    let { data: insertedData, error } = await supabaseAdmin
      .from('structural_assessments')
      .insert([sanitizedData])
      .select()
      .single();

    // Defensive fallback if user hasn't run SQL migrations for new columns yet
    if (error && error.message.includes("Could not find")) {
      console.warn("Supabase schema missing new columns. Retrying with core columns only.");
      delete (sanitizedData as any).confidence_score;
      delete (sanitizedData as any).override_badge_id;
      delete (sanitizedData as any).override_justification;
      const retry = await supabaseAdmin
        .from('structural_assessments')
        .insert([sanitizedData])
        .select()
        .single();
      insertedData = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }

    const recordId = insertedData.id;

    // 2. Publish incident alert to Upstash Redis channel `channel:tactical-alerts`
    const payload = JSON.stringify({
      id: recordId,
      building_name: insertedData.building_name,
      placard_status: insertedData.placard_status,
      latitude: insertedData.latitude,
      longitude: insertedData.longitude,
      collapse_radius_meters: insertedData.collapse_radius_meters,
      timestamp: insertedData.created_at,
    });

    await redis.publish('channel:tactical-alerts', payload);

    // 3. LPUSH to recent_assessments and LTRIM
    await redis.lpush('recent_assessments', recordId);
    await redis.ltrim('recent_assessments', 0, 49);

    return NextResponse.json({ success: true, recordId });
  } catch (error) {
    console.error('Save API error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
