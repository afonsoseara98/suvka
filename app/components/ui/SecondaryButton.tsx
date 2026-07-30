type Props = {
  children: React.ReactNode;
};

export default function SecondaryButton({
  children,
}: Props) {
  return (
    <button
      className="
        rounded-xl
        border
        border-white/10
        bg-white/5
        px-8
        py-4
        font-semibold
        backdrop-blur-xl

        transition

        hover:bg-white/10
      "
    >
      {children}
    </button>
  );
}