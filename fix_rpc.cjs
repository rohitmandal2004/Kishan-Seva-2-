const { Client } = require('pg');

async function fixRPC() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });
  
  try {
    await client.connect();
    
    // Find all signatures for create_booking
    const res = await client.query(`
      SELECT oid::regprocedure AS signature
      FROM pg_proc
      WHERE proname = 'create_booking' AND pronamespace = 'public'::regnamespace;
    `);
    
    console.log('Found functions:', res.rows);
    
    for (const row of res.rows) {
      if (row.signature.includes('uuid')) {
        console.log(`Dropping ${row.signature}`);
        await client.query(`DROP FUNCTION IF EXISTS ${row.signature} CASCADE;`);
      }
    }
    
    console.log('Done!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

fixRPC();
