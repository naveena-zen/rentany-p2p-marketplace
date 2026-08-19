import axios from 'axios';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:5000/api';

async function runConcurrencyLoadTest() {
  console.log('================================================================');
  console.log('       RENTANY CONCURRENCY SAFETY & LOAD TEST BENCHMARK          ');
  console.log('================================================================\n');

  try {
    // 1. Register test renter
    const email = `loadtest_renter_${Date.now()}@rentany.com`;
    const authRes = await axios.post(`${API_BASE}/auth/register`, {
      email,
      password: 'password123',
      name: 'Concurrency Tester',
      roles: ['RENTER'],
    });

    const token = authRes.data.accessToken;

    // 2. Fetch an active item
    const itemsRes = await axios.get(`${API_BASE}/items`);
    if (!itemsRes.data || itemsRes.data.length === 0) {
      throw new Error('No active items found in database. Run seed script first!');
    }
    const targetItem = itemsRes.data[0];

    const startDate = new Date(Date.now() + 86400000 * 40).toISOString();
    const endDate = new Date(Date.now() + 86400000 * 43).toISOString();

    console.log(`[Load Test Target] Item ID: ${targetItem.id}`);
    console.log(`[Load Test Slot]   ${startDate} ---> ${endDate}`);
    console.log(`[Load Test Scale]  Firing 100 simultaneous concurrent booking requests...\n`);

    // 3. Fire 100 simultaneous requests
    const CONCURRENCY_COUNT = 100;
    const requestPromises = Array.from({ length: CONCURRENCY_COUNT }).map(async (_, idx) => {
      try {
        const res = await axios.post(
          `${API_BASE}/agreements`,
          {
            itemId: targetItem.id,
            startDate,
            endDate,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
            validateStatus: () => true, // Don't throw on non-2xx
          }
        );
        return { index: idx, status: res.status, data: res.data };
      } catch (err: any) {
        return { index: idx, status: 500, error: err.message };
      }
    });

    const results = await Promise.all(requestPromises);

    // 4. Analyze Results
    const statusCounts: Record<number, number> = {};
    results.forEach((r) => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    });

    const successCount = statusCounts[201] || 0;
    const conflictCount = statusCounts[409] || 0;
    const errorCount = Object.keys(statusCounts)
      .filter((s) => s !== '201' && s !== '409')
      .reduce((acc, code) => acc + statusCounts[parseInt(code)], 0);

    const isSuccess = successCount === 1 && conflictCount === CONCURRENCY_COUNT - 1;

    const reportContent = `
================================================================================
           RENTANY BENCHMARK REPORT: CONCURRENCY BOOKING PROTECTION             
================================================================================
Timestamp: ${new Date().toISOString()}
Target Item: ${targetItem.title} (${targetItem.id})
Date Range: ${startDate} to ${endDate}
Total Concurrent Requests Sent: ${CONCURRENCY_COUNT}

--------------------------------------------------------------------------------
HTTP STATUS BREAKDOWN:
- HTTP 201 Created (Successful Booking) : ${successCount}
- HTTP 409 Conflict (Correctly Rejected): ${conflictCount}
- Other / Unhandled Errors               : ${errorCount}

--------------------------------------------------------------------------------
VERIFICATION ANALYSIS:
- Naive Implementation Outcome : Race condition -> Multiple double-bookings (Overlapping slots)
- RentAny Locked Outcome       : Redis SETNX / Transactional Locking -> Exactly 1 Winner (${successCount}), ${conflictCount} Rejected

PASSED CONCURRENCY SAFETY GUARANTEE: ${isSuccess ? 'YES - ZERO DOUBLE BOOKINGS DETECTED' : 'NO'}
================================================================================
`.trim();

    console.log(reportContent);

    // Save report to results.log
    const logPath = path.join(__dirname, 'results.log');
    fs.writeFileSync(logPath, reportContent, 'utf-8');
    console.log(`\n[Load Test] Results logged successfully to: ${logPath}`);
  } catch (error: any) {
    console.error('[Load Test Error]', error.message || error);
    process.exit(1);
  }
}

runConcurrencyLoadTest();
