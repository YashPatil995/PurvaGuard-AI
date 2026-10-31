async function testInvalid() {
  const res = await fetch('http://localhost:3000/api/prediction?lat=999&lng=999&_t=' + Date.now())
  console.log('Status code for lat=999:', res.status)
  const d = await res.json()
  console.log('Response for invalid coords:')
  console.log('Predictions:', d.predictions?.map(p => ({ hazard: p.hazardType, status: p.status, score: p.riskScore, conf: p.confidence, cov: p.dataCoveragePct, note: p.note })))
}
testInvalid().catch(console.error)
