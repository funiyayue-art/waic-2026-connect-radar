type Mode = "explore" | "planned" | "my";

export default function BottomNavigation({
  active,
  onNavigate,
}: {
  active: Mode;
  onNavigate: (mode: Mode) => void;
}) {
  return (
    <nav aria-label="移动端主导航" className="bottom-navigation">
      {[
        ["explore", "随便逛", "⌕"],
        ["planned", "找目标", "◎"],
        ["my", "我的", "☆"],
      ].map(([mode, label, icon]) => (
        <button
          aria-current={active === mode ? "page" : undefined}
          className={active === mode ? "active" : ""}
          key={mode}
          onClick={() => onNavigate(mode as Mode)}
          type="button"
        >
          <span aria-hidden="true">{icon}</span>
          <b>{label}</b>
        </button>
      ))}
    </nav>
  );
}
