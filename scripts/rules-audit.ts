import { auditAllRules, formatRulesAudit } from '../src/game/audit/rules-audit-pure';

const reports = auditAllRules();
console.log(formatRulesAudit(reports));
process.exit(reports.every((r) => r.ok) ? 0 : 1);
