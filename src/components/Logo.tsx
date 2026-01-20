import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  href?: string;
  admin?: boolean;
}

export default function Logo({
  size = "md",
  showText = true,
  href = "/",
  admin = false,
}: LogoProps) {
  const sizes = {
    sm: { image: 32, text: "text-lg" },
    md: { image: 40, text: "text-xl" },
    lg: { image: 56, text: "text-3xl" },
  };

  const content = (
    <div className="flex items-center gap-3">
      <Image
        src="/logo.png"
        alt="TFT Finder Logo"
        width={sizes[size].image}
        height={sizes[size].image}
        className="object-contain"
        priority
      />
      {showText && (
        <h1 className={`${sizes[size].text} font-bold text-tft-gold`}>
          TFT FINDER{admin ? " - ADMIN" : ""}
        </h1>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="hover:opacity-80 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
