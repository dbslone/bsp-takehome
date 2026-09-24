import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import {
  charactersRemaining,
  LONG_FIELD_MAX,
  SHORT_FIELD_MAX,
  type BriefFormErrors,
  type BriefFormField,
  type BriefFormValues,
} from '../../briefForm'

type BriefFormFieldsProps = {
  values: BriefFormValues
  errors: BriefFormErrors
  disabled: boolean
  onChange: (field: BriefFormField, value: string) => void
}

function BriefFormFields({ values, errors, disabled, onChange }: BriefFormFieldsProps) {
  return (
    <>
      <ShortField
        field="title"
        label="Title"
        values={values}
        errors={errors}
        disabled={disabled}
        onChange={onChange}
      />
      <LongField
        field="description"
        label="Description"
        values={values}
        errors={errors}
        disabled={disabled}
        onChange={onChange}
      />
      <ShortField
        field="contentType"
        label="Content type"
        values={values}
        errors={errors}
        disabled={disabled}
        onChange={onChange}
      />
      <OpenField
        field="targetAudience"
        label="Target audience"
        values={values}
        errors={errors}
        disabled={disabled}
        onChange={onChange}
      />
      <LongField
        field="notes"
        label="Notes"
        values={values}
        errors={errors}
        disabled={disabled}
        onChange={onChange}
      />
      <Typography variant="body2" color="text.secondary">
        Blank fields are filled from the file after analysis.
      </Typography>
    </>
  )
}

type FieldProps = BriefFormFieldsProps & {
  field: BriefFormField
  label: string
}

function ShortField({ field, label, values, errors, disabled, onChange }: FieldProps) {
  const error = errors[field]
  return (
    <TextField
      label={label}
      value={values[field]}
      onChange={(event) => onChange(field, event.target.value)}
      disabled={disabled}
      error={Boolean(error)}
      helperText={error ?? charactersRemaining(values[field], SHORT_FIELD_MAX)}
      fullWidth
      slotProps={{ htmlInput: { maxLength: SHORT_FIELD_MAX } }}
    />
  )
}

function LongField({ field, label, values, errors, disabled, onChange }: FieldProps) {
  const error = errors[field]
  return (
    <TextField
      label={label}
      value={values[field]}
      onChange={(event) => onChange(field, event.target.value)}
      disabled={disabled}
      error={Boolean(error)}
      helperText={error}
      multiline
      minRows={2}
      fullWidth
      slotProps={{ htmlInput: { maxLength: LONG_FIELD_MAX } }}
    />
  )
}

function OpenField({ field, label, values, errors, disabled, onChange }: FieldProps) {
  const error = errors[field]
  return (
    <TextField
      label={label}
      value={values[field]}
      onChange={(event) => onChange(field, event.target.value)}
      disabled={disabled}
      error={Boolean(error)}
      helperText={error}
      fullWidth
    />
  )
}

export default BriefFormFields
