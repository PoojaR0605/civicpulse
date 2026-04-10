const { pool } = require('../config/db');

const WardModel = {
  async findAll(city = 'Bengaluru') {
    const { rows } = await pool.query(
      `SELECT id, ward_number, ward_name, city, zone,
              area_sqkm, population, risk_score
       FROM wards
       WHERE city = $1
       ORDER BY ward_number ASC`,
      [city]
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT id, ward_number, ward_name, city, zone,
              area_sqkm, population, risk_score
       FROM wards WHERE id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  // THE KEY QUERY — point-in-polygon using PostGIS
  async findByCoordinates(lat, lng) {
    const { rows } = await pool.query(
      `SELECT id, ward_number, ward_name, city, zone, risk_score
       FROM wards
       WHERE ST_Contains(
         boundary,
         ST_SetSRID(ST_Point($2, $1), 4326)
       )
       LIMIT 1`,
      [lat, lng]
    );
    return rows[0] || null;
  },

  async getStats(wardId) {
    const { rows } = await pool.query(
      `SELECT
         COUNT(*)                                          AS total_issues,
         COUNT(*) FILTER (WHERE status = 'resolved')      AS resolved,
         COUNT(*) FILTER (WHERE status = 'in_progress')   AS in_progress,
         COUNT(*) FILTER (WHERE status = 'submitted')     AS pending,
         COUNT(*) FILTER (WHERE sla_breached = TRUE)      AS sla_breached,
         ROUND(AVG(priority_score)::NUMERIC, 2)           AS avg_priority
       FROM issues
       WHERE ward_id = $1`,
      [wardId]
    );
    return rows[0];
  },
};

module.exports = WardModel;