import { regions, schools, type AffiliationFields } from './studentProfile';

export function SchoolFields({ value, onChange }: {
  value: AffiliationFields;
  onChange: (value: AffiliationFields) => void;
}) {
  return (
    <>
      <label className="fw-field">School or university
        <select value={value.school} onChange={(event) => onChange({ ...value, school: event.target.value, customSchool: '' })}>
          <option value="">Independent learner</option>
          {schools.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
          <option value="other">Add my school</option>
        </select>
      </label>
      {value.school === 'other' && <label className="fw-field">School name
        <input value={value.customSchool} onChange={(event) => onChange({ ...value, customSchool: event.target.value })} maxLength={70} required pattern=".*\S.*" />
      </label>}
      <label className="fw-field">State or territory
        <select value={value.stateCode} onChange={(event) => onChange({ ...value, stateCode: event.target.value })}>
          <option value="">Choose a state or territory (optional)</option>
          {regions.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
        </select>
      </label>
    </>
  );
}
