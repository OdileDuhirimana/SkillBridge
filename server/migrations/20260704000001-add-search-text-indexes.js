/**
 * Ensures the compound text indexes backing `$text` search on Jobs and
 * Companies exist, independent of Mongoose's `autoIndex` behavior.
 *
 * WHY this migration exists even though the indexes are already declared
 * in `server/models/Job.js` / `server/models/Company.js`: Mongoose's
 * schema-level `.index()` calls only create indexes automatically when
 * `autoIndex: true` (the default in development/test, but a setting
 * production deployments commonly disable — `mongoose.set('autoIndex',
 * false)` — specifically to avoid an index-build attempting to run against
 * a live, possibly-large collection during app startup). A migration is
 * the correct place to run that index build deliberately, once, as part
 * of a controlled deployment step, rather than implicitly on every app
 * boot. This is also the concrete change that made `buildJobQuery`'s and
 * `getCompanies`'s move from `$regex` to `$text` (see
 * server/controllers/jobController.js / companyController.js) actually
 * backed by an index in a production-like deployment.
 */
module.exports = {
  async up(db) {
    await db.collection('jobs').createIndex(
      {
        title: 'text',
        description: 'text',
        category: 'text',
        'location.address.city': 'text',
        'location.address.country': 'text',
        tags: 'text'
      },
      { name: 'job_search_text_index' }
    );

    await db.collection('companies').createIndex(
      {
        name: 'text',
        description: 'text',
        industry: 'text',
        'headquarters.city': 'text',
        'headquarters.country': 'text'
      },
      { name: 'company_search_text_index' }
    );
  },

  async down(db) {
    await db.collection('jobs').dropIndex('job_search_text_index');
    await db.collection('companies').dropIndex('company_search_text_index');
  }
};
