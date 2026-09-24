import Checklist from '@mui/icons-material/Checklist'
import RadioButtonUnchecked from '@mui/icons-material/RadioButtonUnchecked'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { BriefAnalysis } from '../../types'
import { itemKey } from './itemKey'
import ItemRow from './ItemRow'
import SectionCard from './SectionCard'

type NextAction = BriefAnalysis['nextActions'][number]
type Priority = NextAction['priority']

const PRIORITIES: Priority[] = ['now', 'soon', 'later']
const PRIORITY_LABEL = { now: 'Now', soon: 'Soon', later: 'Later' } as const
const PRIORITY_COLOR = { now: 'primary', soon: 'secondary', later: 'disabled' } as const

function NextActionList({ actions }: { actions: NextAction[] }) {
  return (
    <SectionCard title="Recommended next actions" icon={<Checklist />}>
      {actions.length === 0 ? (
        <Typography color="text.secondary">None noted</Typography>
      ) : (
        <Stack spacing={2.5}>
          {PRIORITIES.map((priority) => (
            <PriorityGroup
              key={priority}
              priority={priority}
              actions={actions.filter((action) => action.priority === priority)}
            />
          ))}
        </Stack>
      )}
    </SectionCard>
  )
}

function PriorityGroup({ priority, actions }: { priority: Priority; actions: NextAction[] }) {
  if (actions.length === 0) return null
  return (
    <Stack spacing={1.5}>
      <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.5 }}>
        {PRIORITY_LABEL[priority]}
      </Typography>
      {actions.map((action) => (
        <Stack key={itemKey(action)} direction="row" spacing={1.5}>
          <RadioButtonUnchecked
            color={PRIORITY_COLOR[priority]}
            fontSize="small"
            sx={{ mt: 0.25 }}
          />
          <ItemRow item={action} />
        </Stack>
      ))}
    </Stack>
  )
}

export default NextActionList
