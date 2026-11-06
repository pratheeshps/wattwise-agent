# Wattwise Agent

A small command-line AI agent that analyses electricity bills. It uses Claude and tool calling to fetch bill data, compare two months, and explain what changed in consumption and cost.

The bill data is currently hardcoded sample data in [`src/tools.js`](src/tools.js), covering October and November.

## How it works

The agent runs a loop of up to 6 iterations:

1. It sends the goal and the available tools to the model.
2. If the model asks for a tool, the agent runs it and sends back the result. Tool errors are returned to the model too.
3. When the model finishes its turn, the agent returns the final text as the report.

If the model hasn't finished after 6 iterations, or stops for any reason other than finishing or calling a tool, the agent throws an error.

The system prompt tells the model to retrieve real bill data before comparing, use the comparison tool for calculations, and never invent missing data.

### Tools

| Tool | Input | Returns |
| --- | --- | --- |
| `get_bills` | None | All available bills: month, units and amount |
| `compare_bills` | `previous_month`, `current_month` | Difference in units, difference in amount, and percentage change in units |

Month names are not case-sensitive. `compare_bills` returns an error if either month has no bill.

## Getting started

### Prerequisites

- Node.js
- An API key for the Anthropic API or a compatible endpoint

### Setup

```bash
git clone https://github.com/pratheeshps/wattwise-agent.git
cd wattwise-agent
npm install
```

Create a `.env` file in the project root:

```bash
ANTHROPIC_AUTH_TOKEN=your-api-key
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_MODEL=your-model-id
```

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_AUTH_TOKEN` | API key used to authenticate requests |
| `ANTHROPIC_BASE_URL` | API endpoint that requests are sent to |
| `ANTHROPIC_MODEL` | ID of the model to use |

`.env` is ignored by git, so your key stays out of the repository.

### Run

```bash
npm start
```

This runs the goal set in [`src/index.js`](src/index.js), which compares the October and November bills, and prints the report to the terminal. To ask something else, change the goal passed to `runAgent` in that file.

## Project structure

```text
src/
├── index.js   # Entry point: loads .env, runs the agent, prints the report
├── agent.js   # Agent loop and system prompt
└── tools.js   # Sample bill data, tool definitions and tool execution
```
