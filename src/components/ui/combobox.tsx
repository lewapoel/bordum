'use client';

import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CSSProperties, useMemo, useState } from 'react';
import { Highlight, useFuzzySearchList } from '@nozbe/microfuzz/react';

export type ComboboxItem = {
  value: any;
  label: string;
};

interface ComboboxProps {
  items: Array<ComboboxItem>;
  width: CSSProperties['width'];
  value: string;
  onChange: (value: string) => void;
}

export default function Combobox({
  items,
  width,
  value,
  onChange,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const sortedItems = useMemo(
    () =>
      items.sort((a, b) => {
        if (a.value === value) return -1;
        if (b.value === value) return 1;

        return a.label.localeCompare(b.label);
      }),
    [value, items],
  );

  const filteredItems = useFuzzySearchList({
    list: sortedItems,
    queryText: searchValue,
    getText: (item) => [item.label],
    mapResultItem: ({ item, matches: [highlightRanges] }) => ({
      item,
      highlightRanges,
    }),
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          className='justify-between'
          style={{ width }}
        >
          <span className='truncate'>
            {value
              ? items.find((item) => item.value === value)?.label
              : 'Wybierz pozycję...'}
          </span>
          <ChevronsUpDown className='opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent style={{ width }} className='p-0'>
        <Command shouldFilter={false}>
          <CommandInput
            value={searchValue}
            onValueChange={(search) => setSearchValue(search)}
            placeholder='Wyszukaj pozycję...'
            className='h-9'
          />
          <CommandList>
            {filteredItems.length === 0 && (
              <CommandEmpty>Brak wyników.</CommandEmpty>
            )}
            <CommandGroup>
              {filteredItems.map(({ item, highlightRanges }) => (
                <CommandItem
                  key={item.value}
                  value={item.value}
                  onSelect={(currentValue) => {
                    onChange?.(currentValue === value ? '' : currentValue);
                    setOpen(false);
                  }}
                >
                  <p>
                    <Highlight text={item.label} ranges={highlightRanges} />
                  </p>
                  <Check
                    className={cn(
                      'ml-auto',
                      value === item.value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
