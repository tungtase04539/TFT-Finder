import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const roomId = formData.get('roomId') as string;
    const reportedUserId = formData.get('reportedUserId') as string;
    const violationTypesStr = formData.get('violationTypes') as string;
    const description = formData.get('description') as string | null;

    // Validate required fields
    if (!roomId || !reportedUserId || !violationTypesStr) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Parse violation types
    let violationTypes: string[];
    try {
      violationTypes = JSON.parse(violationTypesStr);
    } catch {
      return NextResponse.json(
        { error: 'Invalid violation types format' },
        { status: 400 }
      );
    }

    // Validate violation types
    const validTypes = ['game_sabotage', 'rule_violation', 'harassment', 'discrimination'];
    const invalidTypes = violationTypes.filter(t => !validTypes.includes(t));
    if (invalidTypes.length > 0 || violationTypes.length === 0) {
      return NextResponse.json(
        { error: 'Invalid violation types' },
        { status: 400 }
      );
    }

    console.log('[REPORT_CREATE] Creating report from', user.id, 'against', reportedUserId);

    // Upload evidence images to Supabase Storage
    const evidenceUrls: string[] = [];
    const evidenceFiles: File[] = [];
    
    // Collect all evidence files
    for (let i = 0; i < 3; i++) {
      const file = formData.get(`evidence_${i}`) as File | null;
      if (file) {
        evidenceFiles.push(file);
      }
    }

    // Validate image count and sizes
    if (evidenceFiles.length > 3) {
      return NextResponse.json(
        { error: 'Maximum 3 images allowed' },
        { status: 400 }
      );
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = evidenceFiles.filter(f => f.size > MAX_SIZE);
    if (oversizedFiles.length > 0) {
      return NextResponse.json(
        { error: 'Each image must be less than 5MB' },
        { status: 400 }
      );
    }

    // Upload images to storage
    for (let i = 0; i < evidenceFiles.length; i++) {
      const file = evidenceFiles[i];
      const timestamp = Date.now();
      const filename = `${user.id}/${timestamp}_${i}_${file.name}`;

      try {
        // Convert File to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('report-evidence')
          .upload(filename, buffer, {
            contentType: file.type,
            upsert: false
          });

        if (uploadError) {
          console.error('[REPORT_CREATE] Upload error:', uploadError);
          throw uploadError;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('report-evidence')
          .getPublicUrl(filename);

        evidenceUrls.push(urlData.publicUrl);
        console.log('[REPORT_CREATE] Uploaded evidence:', filename);

      } catch (error) {
        console.error('[REPORT_CREATE] Failed to upload image:', error);
        // Continue with other images
      }
    }

    // Create report record in database
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert({
        room_id: roomId,
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        violation_types: violationTypes,
        description: description || null,
        evidence_urls: evidenceUrls,
        status: 'pending'
      })
      .select('id')
      .single();

    if (reportError) {
      console.error('[REPORT_CREATE] Database error:', reportError);
      return NextResponse.json(
        { error: 'Failed to create report' },
        { status: 500 }
      );
    }

    console.log('[REPORT_CREATE] Report created successfully:', report.id);

    return NextResponse.json({
      success: true,
      reportId: report.id,
      message: 'Báo cáo đã được gửi thành công'
    });

  } catch (error) {
    console.error('[REPORT_CREATE] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
