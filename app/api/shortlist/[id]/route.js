import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { connect, serializeFirestoreData } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function PATCH(req, { params }) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const { shortlisted } = await req.json();

    // Written by the client as a real boolean (!isShortlisted) today, but
    // nothing enforced that server-side - a malformed body would previously
    // be written to Firestore as-is (e.g. a non-empty string, which is
    // truthy regardless of its value, silently breaking the shortlisted
    // count/filter logic downstream).
    if (typeof shortlisted !== 'boolean') {
        return NextResponse.json({ success: false, message: 'shortlisted must be a boolean' }, { status: 400 });
    }

    const db = await connect();

    try {
        const docRef = db.collection('formData').doc(id);

        // Checked before writing, not after: Firestore's update() throws on
        // a nonexistent document, so the previous order (update, then check
        // snapshot.exists) meant that check could never actually run - a bad
        // id always fell into the catch block below instead of this 404.
        const existing = await docRef.get();
        if (!existing.exists) {
            return NextResponse.json({ success: false, message: 'Applicant not found' }, { status: 404 });
        }

        await docRef.update({ shortlisted });

        // Overlays the just-written value onto the doc read moments ago,
        // rather than reading it back a second time - same one-read/one-
        // write cost as before, just reordered.
        const applicant = {
            id: existing.id,
            _id: existing.id,
            ...serializeFirestoreData(existing.data()),
            shortlisted,
        };

        return NextResponse.json({ success: true, data: applicant });
    } catch (error) {
        console.error('Error updating applicant:', error.message);
        return NextResponse.json({ success: false, message: 'Failed to update applicant' }, { status: 500 });
    }
}
