export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/resources?telegram_id=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const telegram_id = searchParams.get('telegram_id');
    if (!telegram_id) return NextResponse.json({ error: 'Missing telegram_id' }, { status: 400 });

    // Get user + their groups
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, user_groups(group_id)')
      .eq('telegram_id', telegram_id)
      .single();

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const userGroupIds = (user.user_groups || []).map((ug: any) => ug.group_id);

    // Fetch global resources + group-specific resources for user's groups
    const { data: resources, error } = await supabaseAdmin
      .from('resources')
      .select(`
        id, title, description, file_url, file_type, link_url,
        category, is_global, group_id, file_size_kb, duration_seconds,
        created_at, uploaded_by,
        groups(name),
        users!uploaded_by(name, role)
      `)
      .eq('is_active', true)
      .or(`is_global.eq.true${userGroupIds.length > 0 ? `,group_id.in.(${userGroupIds.join(',')})` : ''}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Group by category
    const byCategory: Record<string, any[]> = {};
    (resources || []).forEach(r => {
      const cat = r.category || 'General';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(r);
    });

    return NextResponse.json({ resources: resources || [], byCategory });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/resources — upload a resource (admin/leader only)
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const telegram_id = formData.get('telegram_id') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const file_type = formData.get('file_type') as string;
    const category = formData.get('category') as string || 'General';
    const is_global = formData.get('is_global') === 'true';
    const group_id = formData.get('group_id') as string | null;
    const link_url = formData.get('link_url') as string | null;
    const file = formData.get('file') as File | null;

    if (!telegram_id || !title || !file_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify admin or leader
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('telegram_id', telegram_id)
      .single();

    if (!user || !['admin', 'leader'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    let file_url: string | null = null;
    let file_size_kb: number | null = null;

    // Upload file to Supabase storage
    if (file && file.size > 0 && file_type !== 'link') {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = file.name.split('.').pop() || 'bin';
      const fileName = `${category}/${Date.now()}-${title.replace(/\s+/g, '-').toLowerCase()}.${ext}`;
      file_size_kb = Math.round(file.size / 1024);

      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('resources')
        .upload(fileName, buffer, { contentType: file.type, upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabaseAdmin.storage.from('resources').getPublicUrl(fileName);
      file_url = urlData.publicUrl;
    }

    const { data: resource, error } = await supabaseAdmin
      .from('resources')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        file_url,
        file_type,
        link_url: file_type === 'link' ? link_url : null,
        category,
        is_global,
        group_id: is_global ? null : group_id,
        uploaded_by: user.id,
        file_size_kb,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, resource });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// DELETE /api/resources — delete a resource
export async function DELETE(req: NextRequest) {
  try {
    const { telegram_id, resource_id } = await req.json();
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('telegram_id', telegram_id)
      .single();

    if (!user || !['admin', 'leader'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await supabaseAdmin.from('resources').update({ is_active: false }).eq('id', resource_id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
