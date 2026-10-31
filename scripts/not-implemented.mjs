// Placeholder for a gate whose implementation is owned by a later ticket.
// Usage: node scripts/not-implemented.mjs <script-name> <ticket-id>
const [script, ticket] = process.argv.slice(2);
console.log(`${script}: not implemented — ${ticket}`);
