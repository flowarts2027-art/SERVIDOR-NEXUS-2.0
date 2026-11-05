-- Only real online accounts reserve slots. Include in-flight and published
-- posts as anchors, but only move future, unclaimed entries.
CREATE INDEX IF NOT EXISTS idx_panel_slot_time ON post_ledger(unixepoch(scheduled_for));
CREATE VIEW IF NOT EXISTS nexus_panel_slots_v1 AS
SELECT p.id, p.client_id, p.scheduled_for, (p.status IN ('draft','ready','scheduled','failed')) AS status_eligible, unixepoch(p.scheduled_for) AS ts,
       CASE WHEN json_valid(p.payload_json)
            THEN coalesce(json_extract(p.payload_json,'$.creativeFeatures.requestedFormat'),'post')
            ELSE 'post' END AS format
FROM post_ledger p JOIN clients c ON c.id=p.client_id
WHERE c.status='online' AND coalesce(trim(c.instagram),'')<>''
  AND p.status IN ('draft','ready','scheduled','failed','publishing','published')
  AND coalesce(p.approval_status,'')<>'rejected' AND p.scheduled_for IS NOT NULL;

CREATE TRIGGER IF NOT EXISTS nexus_panel_slot_update_v1
AFTER UPDATE OF scheduled_for, client_id, status, approval_status ON post_ledger
WHEN NEW.status IN ('draft','ready','scheduled','failed')
 AND unixepoch(NEW.scheduled_for)>unixepoch('now')
 AND EXISTS (SELECT 1 FROM nexus_panel_slots_v1 me WHERE me.id=NEW.id)
 AND EXISTS (
   SELECT 1 FROM nexus_panel_slots_v1 other
   WHERE other.client_id<>NEW.client_id
     AND other.ts BETWEEN unixepoch(NEW.scheduled_for)-1199 AND unixepoch(NEW.scheduled_for)+1199
 )
BEGIN
  UPDATE post_ledger SET scheduled_for=(
    WITH RECURSIVE
    me AS (SELECT * FROM nexus_panel_slots_v1 WHERE id=NEW.id),
    occupied AS (
      SELECT s.ts, CASE WHEN s.client_id<>me.client_id THEN 1200
                        WHEN s.format<>'story' AND me.format<>'story' THEN 5400
                        ELSE 60 END AS gap
      FROM nexus_panel_slots_v1 s, me
      WHERE s.id<>me.id AND s.ts>=me.ts-5400
    ),
    -- Advance directly to the end of an overlapping interval. At night,
    -- continue at 08:00 Sao Paulo. No upper bound on the number of panels.
    search(t) AS (
      SELECT ts FROM me
      UNION ALL
      SELECT CASE
        WHEN time(t,'unixepoch','-3 hours')<'08:00:00' THEN unixepoch(date(t,'unixepoch','-3 hours')||' 11:00:00')
        WHEN time(t,'unixepoch','-3 hours')>'22:00:00' THEN unixepoch(date(t,'unixepoch','-3 hours','+1 day')||' 11:00:00')
        ELSE (SELECT max(ts+gap) FROM occupied WHERE abs(t-ts)<gap)
      END FROM search WHERE t IS NOT NULL
    )
    SELECT strftime('%Y-%m-%dT%H:%M:%fZ',max(t),'unixepoch') FROM search
  ) WHERE id=NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS nexus_panel_slot_insert_v1
AFTER INSERT ON post_ledger
WHEN NEW.status IN ('draft','ready','scheduled','failed')
 AND unixepoch(NEW.scheduled_for)>unixepoch('now')
BEGIN
  UPDATE post_ledger SET scheduled_for=scheduled_for WHERE id=NEW.id;
END;

-- Re-run safely on deploy. Only future conflicting times on real panels move.
UPDATE post_ledger SET scheduled_for=scheduled_for
WHERE id IN (SELECT a.id FROM nexus_panel_slots_v1 a JOIN nexus_panel_slots_v1 b
             ON b.client_id<>a.client_id AND b.ts BETWEEN a.ts-1199 AND a.ts+1199
             WHERE a.ts>unixepoch('now'))
  AND status IN ('draft','ready','scheduled','failed');
