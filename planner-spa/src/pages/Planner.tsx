import PlannerPage from '@/components/planner/PlannerPage'
import DecisionCalendar from '@/components/planner/calendar/DecisionCalendar'
import BankingCommand from '@/components/planner/banking/BankingCommand'
import WealthCommand from '@/components/planner/wealth/WealthCommand'
import PlanCommand from '@/components/planner/plan/PlanCommand'

export default function Planner() {
  return (
    <PlannerPage
      calendar={<DecisionCalendar />}
      banking={<BankingCommand />}
      wealth={<WealthCommand />}
      plan={<PlanCommand />}
    />
  )
}
