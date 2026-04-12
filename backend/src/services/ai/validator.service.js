const axios    = require('axios');
const FormData = require('form-data');
const { pool } = require('../../config/db');
const { logger } = require('../../utils/logger');

const VALIDATOR_URL = process.env.VALIDATOR_URL || 'http://localhost:8001';

const ValidatorService = {
  async validateIssue({ issueId, imageBuffer, imageName, category, lat, lng }) {
    try {
      const form = new FormData();
      form.append('image',    imageBuffer, { filename: imageName || 'issue.jpg' });
      form.append('category', category);
      form.append('lat',      lat.toString());
      form.append('lng',      lng.toString());

      const response = await axios.post(
        `${VALIDATOR_URL}/validate`,
        form,
        {
          headers: form.getHeaders(),
          timeout: 15000,
        }
      );

      const result = response.data;
      logger.info(`AI validation result for issue ${issueId}: status=${result.status} confidence=${result.confidence}`);

      // Update issue with AI result
      await pool.query(
        `UPDATE issues
         SET ai_status       = $1::text,
             ai_confidence   = $2::numeric,
             ai_category     = $3::text,
             ai_validated_at = NOW(),
             status = CASE
               WHEN $1::text = 'validated' THEN 'validated'::text
               ELSE status
             END
         WHERE id = $4::uuid`,
        [
          result.status,
          result.confidence,
          result.detected_category,
          issueId,
        ]
      );

      // Log status change if validated
      if (result.status === 'validated') {
        await pool.query(
          `INSERT INTO issue_status_history (issue_id, to_status, note)
           VALUES ($1::uuid, $2::text, $3::text)`,
          [
            issueId,
            'validated',
            `AI validation passed — confidence ${result.confidence}`,
          ]
        );
      }

      return result;

    } catch (err) {
      logger.warn(
        `AI validation failed for issue ${issueId} — marking manual_review:`,
        err.message
      );

      // Fail safe — never block the issue, just flag for manual review
      await pool.query(
        `UPDATE issues
         SET ai_status       = 'manual_review'::text,
             ai_validated_at = NOW()
         WHERE id = $1::uuid`,
        [issueId]
      );

      return {
        status:     'manual_review',
        confidence: null,
        reason:     'Validator service unavailable',
      };
    }
  },
};

module.exports = ValidatorService;