import { SearchIcon } from '../layout/icons';

export default function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="search-box toolbar">
      <SearchIcon />
      <input type="text" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
