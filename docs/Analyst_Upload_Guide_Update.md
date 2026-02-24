# Analyst (אנליסט) - Upload Guide Update

## Life Insurance

**Sheet Name:** Any sheet

**Important: No dedicated Agent Number column exists in Analyst Excel files.**

Both `agentName` and `agentNumber` are read from the same column: `שם סוכן`.

The system uses generic cleaning logic to extract a number if present:

- If `שם סוכן` = `"70504-גל אלמגור"` → `agentNumber = "70504"`, `agentName = "גל אלמגור"`
- If `שם סוכן` = `"גל אלמגור"` (no number) → `agentNumber = "גל אלמגור"`, `agentName = "גל אלמגור"`

### Required Fields

| Field | Required | Column Name (Hebrew) | Notes |
|-------|----------|---------------------|-------|
| Agent Name | Yes | שם סוכן | Agent name — also used to extract agent number |
| Agent Number | **No dedicated column** | שם סוכן | Extracted from agent name if format is `"Number-Name"`. If no number prefix, agent name is used as agent number |
| Output/Amount | Yes | יתרה | Balance |
| Date Filter | Yes | תאריך הצטרפות | Join date — filters by both year AND month match |
| Product | No | סניף, מסלול, חשבון | Branch, Track, Account |
| Insured ID | No | תז | ID Number |

### Additional Fields (stored but not used in aggregation)

| Field | Column Name (Hebrew) | Notes |
|-------|---------------------|-------|
| Entity Type | סוג ישות | |
| Valuation | שיערוך | |
| Agreement | הסכם | |
| Recruiting Agreement | הסכם מגייס | |
| Agency Number | מס סוכנות | Agency number (NOT agent number) |
| Agency Name | שם סוכנות | |
| Member | עמית | |
| Account Code | קוד חשבון | |
| Super Fund | קופת על | |
| Branch | סניף | |
| Account | חשבון | |
| Branch Track Account | סניף, מסלול, חשבון | |
| Balance | יתרה | Same as output |
| Commission Payable | עמלה לתשלום לסוכנות | |

### Aggregation

| Category | Type | Amount Column |
|----------|------|---------------|
| FINANCIAL | SIMPLE | `balance` (יתרה) |

All Analyst data goes to **FINANCIAL** category only.

### Agent Matching

- Aggregation uses `agent_data.analyst_agent_id` to match `raw_data.agent_number`
- If `שם סוכן` has number prefix → `analyst_agent_id` must contain that number
- If `שם סוכן` is name only → `analyst_agent_id` must contain the exact agent name

### Date Filtering (2 stages)

1. **Year filter**: Skip rows where `תאריך הצטרפות` year != upload year
2. **Month filter**: Skip rows where `תאריך הצטרפות` month != upload month

Supported date formats: `YYYY-MM-DD`, `M/D/YYYY`, Excel serial number, Date object
