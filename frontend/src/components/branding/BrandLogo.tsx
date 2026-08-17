import brandLogoImage from "../../assets/images/fortesite-logo.png";

import "./BrandLogo.css";

interface BrandLogoProps {
  theme?: "light" | "dark";
  className?: string;
}

export const BrandLogo = ({
  theme = "light",
  className = "",
}: BrandLogoProps) => {
  const classes = ["brand-logo", `brand-logo--${theme}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes}>
      <img
        className="brand-logo__image"
        src={brandLogoImage}
        alt="FORTESITE"
        draggable={false}
      />
    </span>
  );
};

export default BrandLogo;
