import { Dispatch, ReactNode, SetStateAction } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover.tsx';

export interface BalloonTooltipProps {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  children?: ReactNode;
}

export default function BalloonTooltip({
  open,
  setOpen,
  children,
}: BalloonTooltipProps) {
  return (
    <div className='text-sm absolute [&_[data-radix-popper-content-wrapper]]:!absolute'>
      <Popover open={open}>
        <PopoverTrigger></PopoverTrigger>
        <PopoverContent
          side='top'
          sideOffset={50}
          className='cursor-pointer absolute p-2 -translate-y-[calc(100%-20px)] -translate-x-1/4'
          onClick={() => setOpen(false)}
        >
          {children}
        </PopoverContent>
      </Popover>
    </div>
  );
}
