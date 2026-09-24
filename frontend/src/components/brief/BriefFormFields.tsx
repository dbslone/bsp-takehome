import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import {
  charactersRemaining,
  isBriefFieldRequired,
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
  hasFile: boolean
  onChange: (field: BriefFormField, value: string) => void
}

function BriefFormFields({ values, errors, disabled, hasFile, onChange }: BriefFormFieldsProps) {
  return (
    <>
      <ShortField
        field="title"
        label="Title"
        required
        values={values}
        errors={errors}
        disabled={disabled}
        onChange={onChange}
      />
      <LongField
        field="description"
        label="Description"
        required={isBriefFieldRequired('description', hasFile)}
        values={values}
        errors={errors}
        disabled={disabled}
        onChange={onChange}
      />
      <ShortField
        field="contentType"
        label="Content type"
        required={isBriefFieldRequired('contentType', hasFile)}
        values={values}
        errors={errors}
        disabled={disabled}
        onChange={onChange}
      />
      <OpenField
        field="targetAudience"
        label="Target audience"
        required={isBriefFieldRequired('targetAudience', hasFile)}
        values={values}
        errors={errors}
        disabled={disabled}
        onChange={onChange}
      />
      <LongField
        field="notes"
        label="Notes"
        required={false}
        values={values}
        errors={errors}
        disabled={disabled}
        onChange={onChange}
      />
      <Typography variant="body2" color="text.secondary">
        {hasFile
          ? 'Blank fields other than title are filled from the file after analysis.'
          : 'Notes are optional.'}
      </Typography>
    </>
  )
}

type FieldProps = Omit<BriefFormFieldsProps, 'hasFile'> & {
  field: BriefFormField
  label: string
  required: boolean
}

function ShortField({ field, label, required, values, errors, disabled, onChange }: FieldProps) {
  const error = errors[field]
  return (
    <TextField
      label={label}
      value={values[field]}
      onChange={(event) => onChange(field, event.target.value)}
      disabled={disabled}
      required={required}
      error={Boolean(error)}
      helperText={error ?? charactersRemaining(values[field], SHORT_FIELD_MAX)}
      fullWidth
      slotProps={{ htmlInput: { maxLength: SHORT_FIELD_MAX } }}
    />
  )
}

function LongField({ field, label, required, values, errors, disabled, onChange }: FieldProps) {
  const error = errors[field]
  return (
    <TextField
      label={label}
      value={values[field]}
      onChange={(event) => onChange(field, event.target.value)}
      disabled={disabled}
      required={required}
      error={Boolean(error)}
      helperText={error}
      multiline
      minRows={2}
      fullWidth
      slotProps={{ htmlInput: { maxLength: LONG_FIELD_MAX } }}
    />
  )
}

function OpenField({ field, label, required, values, errors, disabled, onChange }: FieldProps) {
  const error = errors[field]
  return (
    <TextField
      label={label}
      value={values[field]}
      onChange={(event) => onChange(field, event.target.value)}
      disabled={disabled}
      required={required}
      error={Boolean(error)}
      helperText={error}
      fullWidth
    />
  )
}

export default BriefFormFields
