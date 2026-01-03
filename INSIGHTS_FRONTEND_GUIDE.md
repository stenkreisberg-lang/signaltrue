# Frontend Insights Integration - Quick Guide

## ✅ Components Created

All frontend components for the Insights page are complete:

### Pages
- `/src/pages/app/Insights.js` - Main insights page

### Components  
- `/src/components/insights/TeamStateBadge.js` - State indicator (healthy/strained/overloaded/breaking)
- `/src/components/insights/RiskCard.js` - Risk signal display with drivers
- `/src/components/insights/ActionCard.js` - Recommended/active action display
- `/src/components/insights/ExperimentCard.js` - Active experiment tracker

### Routing
- Route added to `App.js`: `/app/insights/:teamId`

## 🔗 How to Add Insights Navigation

To access the Insights page, users need a way to navigate to `/app/insights/:teamId`. Here are the recommended integration points:

### Option 1: Add to Team Dashboard (Recommended)

If you have a team detail page/dashboard, add an "Insights" button:

```jsx
import { Link } from 'react-router-dom';

// In your team dashboard component:
<Link 
  to={`/app/insights/${teamId}`}
  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
>
  View Insights
</Link>
```

### Option 2: Add to Navigation Menu

If you have a main navigation menu, add an Insights item:

```jsx
<nav>
  <Link to="/app/overview">Overview</Link>
  <Link to="/app/signals">Signals</Link>
  <Link to={`/app/insights/${selectedTeamId}`}>Insights</Link>
  <Link to="/app/privacy">Privacy</Link>
</nav>
```

### Option 3: Add to Team List/Cards

If you display a list of teams, add an "Insights" link to each team card:

```jsx
{teams.map(team => (
  <div key={team._id}>
    <h3>{team.name}</h3>
    <Link to={`/app/insights/${team._id}`}>View Insights →</Link>
  </div>
))}
```

## 🎨 Visual Hierarchy (Per Spec)

The Insights page follows the specification's visual hierarchy:

1. **Team State** (dominant) - Large, clear state indicator
2. **Risk Signals** - Three risk cards with color bands
3. **Recommended Action** - Highlighted action card with CTA
4. **Supporting Metrics** - Link back to detailed metrics

## 🧪 Testing the Feature

### 1. Start the Backend
```bash
cd backend
npm start
```

### 2. Start the Frontend  
```bash
npm start
```

### 3. Navigate to Insights
Once you add a navigation link, or directly visit:
```
http://localhost:3000/app/insights/<your-team-id>
```

### 4. Trigger Manual Diagnosis (for testing)
```bash
curl -X POST http://localhost:8080/api/insights/team/<team-id>/diagnose \
  -H "Authorization: Bearer <your-token>"
```

## 📊 Example User Flow

1. User lands on Overview/Dashboard
2. Sees list of teams
3. Clicks "View Insights" for a team
4. Sees current team state diagnosis
5. Sees 3 risk cards (overload, execution, retention strain)
6. If strained+, sees recommended action
7. Can activate action → starts experiment
8. Experiment tracked for X weeks
9. Impact automatically measured
10. User sees results and learning

## 🚀 Next Steps

1. **Add Navigation** - Choose one of the options above to add Insights link
2. **Test with Real Data** - Once metrics and baselines exist, diagnosis will auto-generate
3. **Weekly Job** - The scheduler runs every Monday at 1 AM to update all teams
4. **Manual Trigger** - Use the POST endpoint for testing/demos

## 🎯 Key Features Working

✅ Team state determination (healthy → breaking)
✅ Risk scoring with formulas from spec
✅ Context-aware action recommendations  
✅ One-active-action-per-team constraint
✅ Experiment tracking
✅ Impact measurement
✅ Automatic weekly diagnosis
✅ Manual diagnosis trigger (for testing)

All backend APIs are ready and all frontend components are built!
