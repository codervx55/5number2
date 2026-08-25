import { Service } from "@/lib/types";
import {
  Instagram,
  Facebook,
  Send,
  MessageCircle,
  Music2,
  X,
  Gamepad2,
  Search,
  ShoppingCart,
  Heart,
  Ghost,
  Linkedin,
  AppWindow,
  Apple,
  Car,
  Wallet,
  LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  instagram: Instagram,
  whatsapp: MessageCircle,
  telegram: Send,
  facebook: Facebook,
  tiktok: Music2,
  twitter: X,
  discord: Gamepad2,
  google: Search,
  amazon: ShoppingCart,
  tinder: Heart,
  snapchat: Ghost,
  linkedin: Linkedin,
  microsoft: AppWindow,
  apple: Apple,
  uber: Car,
  paypal: Wallet,
};

export function ServiceIcon({ service, size = 30 }: { service: Service; size?: number }) {
  const Icon = iconMap[service.id] ?? Search;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-md"
      style={{
        width: size,
        height: size,
        backgroundColor: `${service.color}14`,
        color: service.color,
      }}
    >
      <Icon size={size * 0.55} strokeWidth={2.1} />
    </span>
  );
}
