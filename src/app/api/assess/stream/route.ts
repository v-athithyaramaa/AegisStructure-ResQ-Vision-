import { NextResponse } from 'next/server';
import { supabasePublic } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {

  try {
    const { data, error } = await supabasePublic
      .from('structural_assessments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Stream API error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
