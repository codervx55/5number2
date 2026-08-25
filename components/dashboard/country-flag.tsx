import Image from "next/image";
import { cn } from "@/lib/utils";

export function CountryFlag({
  code,
  className,
  size = 20,
}: {
  code: string;
  className?: string;
  size?: number;
}) {
  return (
    <span
      className={cn(
        "relative inline-block overflow-hidden rounded-[3px] border border-border/70",
        className
      )}
      style={{ width: size, height: size * 0.75 }}
    >
      <Image
        src={`https://flagcdn.com/w40/${code}.png`}
        alt=""
        fill
        sizes="40px"
        className="object-cover"
      />
    </span>
  );
}
