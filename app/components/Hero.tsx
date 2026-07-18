type HeroProps = {
  count: number;
  onChoose: (mode: "explore" | "planned") => void;
};

export default function Hero({ count, onChoose }: HeroProps) {
  return (
    <section className="dual-mode-hero" id="top">
      <p className="decision-eyebrow">WAIC 2026 · BUSINESS CONTACT DECISIONS</p>
      <div className="hero-title-row">
        <h1>WAIC 接洽雷达</h1>
        <span>{count} 条真实展商信息</span>
      </div>
      <p className="hero-value">
        <mark>告诉你该见谁、为何值得聊、现场问什么。</mark>
      </p>
      <div className="mode-entry-grid">
        <button onClick={() => onChoose("explore")} type="button">
          <span>没有明确目标</span>
          <strong>我先随便逛逛</strong>
          <p>不填资料，直接搜企业、展位和产品，看到感兴趣的再深入了解。</p>
          <i aria-hidden="true">→</i>
        </button>
        <button onClick={() => onChoose("planned")} type="button">
          <span>目标明确</span>
          <strong>帮我规划该见谁</strong>
          <p>填写身份、行业和参会目标，生成接洽优先级、清单和路线。</p>
          <i aria-hidden="true">→</i>
        </button>
      </div>
    </section>
  );
}
