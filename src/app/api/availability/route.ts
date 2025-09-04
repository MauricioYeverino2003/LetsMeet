// Read guest_id
// Validate batch slots [Grid alignment and bounds]
// Resolve and create participant
//Bulk INSERT … ON CONFLICT DO NOTHING for available=true
//Bulk DELETE … WHERE (start,end) IN (…) for available=false
//Return { ok: true } (or counts)