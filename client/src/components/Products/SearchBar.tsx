import { useState, useCallback, useRef } from 'react';
import './SearchBar.css';

interface SearchBarProps {
	initialValue?: string;
	onSearch: (query: string) => void;
	placeholder?: string;
}

export function SearchBar({
	initialValue = '',
	onSearch,
	placeholder = 'Search vegan products...',
}: SearchBarProps) {
	const [value, setValue] = useState(initialValue);
	const inputRef = useRef<HTMLInputElement>(null);

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setValue(e.target.value);
		},
		[]
	);

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			onSearch(value);
		},
		[value, onSearch]
	);

	const handleSearchClick = useCallback(() => {
		onSearch(value);
	}, [value, onSearch]);

	const handleClear = useCallback(() => {
		setValue('');
		onSearch('');
		inputRef.current?.focus();
	}, [onSearch]);

	return (
		<form className='search-bar' onSubmit={handleSubmit}>
			<button
				type='button'
				className='search-icon'
				onClick={handleSearchClick}
				title='Search'>
				<svg
					width='20'
					height='20'
					viewBox='0 0 24 24'
					fill='none'
					stroke='currentColor'
					strokeWidth='2'>
					<circle cx='11' cy='11' r='8' />
					<path d='M21 21l-4.35-4.35' />
				</svg>
			</button>

			<input
				ref={inputRef}
				type='text'
				className='search-input'
				value={value}
				onChange={handleChange}
				placeholder={placeholder}
			/>

			{value && (
				<button
					type='button'
					className='search-clear'
					onClick={handleClear}
					title='Clear search'>
					<svg
						width='18'
						height='18'
						viewBox='0 0 24 24'
						fill='none'
						stroke='currentColor'
						strokeWidth='2'>
						<path d='M18 6L6 18M6 6l12 12' />
					</svg>
				</button>
			)}
		</form>
	);
}
