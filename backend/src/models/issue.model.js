const { pool } = require('../config/db');

const IssueModel = {
  async create({
    reportedBy, latitude, longitude, gpsAccuracy,
    address, wardId, category, title, description,
    photoUrl, photoPath, geohash, slaDeadline, basePriority,
  }) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    const { rows } = await pool.query(
      `INSERT INTO issues (
         reported_by, latitude, longitude, gps_accuracy,
         location_point, address, ward_id, category, title, description,
         photo_url, photo_path, geohash, sla_deadline, base_priority
       ) VALUES (
         $1, $2, $3, $4,
         ST_SetSRID(ST_MakePoint($15, $16), 4326),
         $5, $6, $7, $8, $9,
         $10, $11, $12, $13, $14
       )
       RETURNING *`,
      [
        reportedBy, lat, lng,
        gpsAccuracy ? parseFloat(gpsAccuracy) : null,
        address || null, wardId || null, category,
        title || null, description || null,
        photoUrl || null, photoPath || null,
        geohash || null, slaDeadline || null,
        basePriority || 5, lng, lat,
      ]
    );
    return rows[0];
  },

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT
         i.*,
         u.name        AS reporter_name,
         u.phone       AS reporter_phone,
         w.ward_name,
         w.ward_number,
         o.name        AS officer_name
       FROM issues i
       LEFT JOIN users  u ON u.id = i.reported_by
       LEFT JOIN wards  w ON w.id = i.ward_id
       LEFT JOIN users  o ON o.id = i.assigned_to
       WHERE i.id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async findAll({ wardId, category, status, page = 1, limit = 50 } = {}) {
    const conditions = ['i.is_duplicate = FALSE'];
    const params = [];
    let p = 1;

    if (wardId)   { conditions.push(`i.ward_id = $${p++}`);  params.push(wardId); }
    if (category) { conditions.push(`i.category = $${p++}`); params.push(category); }
    if (status)   { conditions.push(`i.status = $${p++}`);   params.push(status); }

    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const where = conditions.join(' AND ');
    const { rows } = await pool.query(
      `SELECT
         i.id, i.category, i.status, i.title,
         i.latitude, i.longitude, i.photo_url,
         i.priority_score, i.vote_count,
         i.sla_deadline, i.sla_breached,
         i.created_at, i.address,
         i.reported_by, i.ward_id,
         i.ai_status, i.ai_confidence,
         i.geohash,
         u.name   AS reporter_name,
         w.ward_name,
         w.ward_number,
         (
           SELECT COUNT(*) FROM issues d
           WHERE d.geohash = i.geohash
           AND d.id != i.id
           AND d.is_duplicate = TRUE
         ) AS duplicate_count
       FROM issues i
       LEFT JOIN users u ON u.id = i.reported_by
       LEFT JOIN wards w ON w.id = i.ward_id
       WHERE ${where}
       ORDER BY i.priority_score DESC, i.created_at DESC
       LIMIT $${p} OFFSET $${p + 1}`,
      params
    );
    return rows;
  },

  async countAll({ wardId, category, status } = {}) {
    const conditions = ['is_duplicate = FALSE'];
    const params = [];
    let p = 1;

    if (wardId)   { conditions.push(`ward_id = $${p++}`);  params.push(wardId); }
    if (category) { conditions.push(`category = $${p++}`); params.push(category); }
    if (status)   { conditions.push(`status = $${p++}`);   params.push(status); }

    const { rows } = await pool.query(
      `SELECT COUNT(*) AS total FROM issues WHERE ${conditions.join(' AND ')}`,
      params
    );
    return parseInt(rows[0].total);
  },

  async updateStatus(id, status, changedBy, note = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: current } = await client.query(
        `SELECT status FROM issues WHERE id = $1`,
        [id]
      );
      const fromStatus = current[0]?.status || null;

      const { rows } = await client.query(
        `UPDATE issues
         SET status     = $1::text,
             updated_at = NOW(),
             resolved_at = CASE WHEN $1::text = 'resolved' THEN NOW() ELSE resolved_at END
         WHERE id = $2::uuid
         RETURNING *`,
        [status, id]
      );

      await client.query(
        `INSERT INTO issue_status_history
           (issue_id, changed_by, from_status, to_status, note)
         VALUES ($1::uuid, $2::uuid, $3::text, $4::text, $5::text)`,
        [id, changedBy, fromStatus, status, note || `Status changed to ${status}`]
      );

      await client.query('COMMIT');
      return rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async incrementVote(id) {
    const { rows } = await pool.query(
      `UPDATE issues
       SET vote_count     = vote_count + 1,
           priority_score = priority_score + 2
       WHERE id = $1
       RETURNING vote_count, priority_score`,
      [id]
    );
    return rows[0];
  },

  async findByReporter(userId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const { rows } = await pool.query(
      `SELECT
         i.id, i.category, i.status, i.title,
         i.photo_url, i.priority_score, i.vote_count,
         i.created_at, i.sla_breached, i.address,
         i.reported_by, i.ai_status, i.ai_confidence,
         i.geohash,
         w.ward_name, w.ward_number,
         (
           SELECT COUNT(*) FROM issues d
           WHERE d.geohash = i.geohash
           AND d.id != i.id
           AND d.is_duplicate = TRUE
         ) AS duplicate_count
       FROM issues i
       LEFT JOIN wards w ON w.id = i.ward_id
       WHERE i.reported_by = $1::uuid
       ORDER BY i.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return rows;
  },
};

module.exports = IssueModel;