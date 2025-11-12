import BalloonTooltip, {
  BalloonTooltipProps,
} from '@/components/BalloonTooltip.tsx';

interface LimitedDiscountTooltip extends BalloonTooltipProps {
  productMaxDiscount: number;
  userMaxDiscount: number;
}

export default function LimitedDiscountTooltip({
  open,
  setOpen,
  userMaxDiscount,
  productMaxDiscount,
}: LimitedDiscountTooltip) {
  return (
    <BalloonTooltip open={open} setOpen={setOpen}>
      <p>
        Wysokość upustu nie może zmniejszyć ceny produktu poniżej ceny zakupu.
      </p>
      <p className='font-bold'>
        Twój maksymalny upust: {Math.floor(userMaxDiscount)}%
      </p>
      <p className='font-bold'>
        Maksymalny upust produktu: {Math.floor(productMaxDiscount)}%
      </p>
    </BalloonTooltip>
  );
}
