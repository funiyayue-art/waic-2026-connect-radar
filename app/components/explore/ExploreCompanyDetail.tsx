import {
  exploreDirections,
  exploreQuestions,
  exploreSummary,
  exploreWatchPoint,
  similarExploreCompanies,
} from "../../explore";
import { companyName } from "../../recommendation";

type Company = {
  id: number;
  company: string;
  venue: string;
  booth: string;
  industry: string;
  segment: string;
  business: string;
};

export default function ExploreCompanyDetail({
  companies,
  company,
  interested,
  onClose,
  onOpenSimilar,
  onPlanFor,
  onToggleInterest,
}: {
  companies: Company[];
  company: Company;
  interested: boolean;
  onClose: () => void;
  onOpenSimilar: (id: number) => void;
  onPlanFor: (id: number) => void;
  onToggleInterest: (id: number) => void;
}) {
  const directions = exploreDirections(company);
  const similar = similarExploreCompanies(companies, company) as Company[];

  return (
    <div className="detail-backdrop explore-detail-backdrop" onClick={onClose} role="presentation">
      <article
        aria-labelledby="explore-detail-title"
        aria-modal="true"
        className="explore-company-detail"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button
          aria-label="关闭企业速览"
          className="detail-close"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
        <header>
          <span>企业速览</span>
          <h2 id="explore-detail-title">{companyName(company.company)}</h2>
          <b>{company.venue} · {company.booth}</b>
          <p>{company.industry} · {company.segment}</p>
        </header>

        <section>
          <span>企业是做什么的</span>
          <p>{exploreSummary(company, 220)}</p>
        </section>
        <section>
          <span>主要产品或业务</span>
          <p>{company.business || "原始资料暂未提供明确业务信息，建议到展位确认。"}</p>
        </section>
        <section>
          <span>适合哪些参会者</span>
          <p>适合正在关注“{company.industry}”及“{company.segment}”相关产品、合作或行业趋势的参会者。</p>
        </section>
        <section>
          <span>值得现场观察什么</span>
          <p>{exploreWatchPoint(company)}</p>
        </section>
        <section>
          <span>建议询问的三个问题</span>
          <ol>
            {exploreQuestions(company).map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ol>
        </section>
        <section>
          <span>相关方向</span>
          <div className="explore-direction-tags">
            {(directions.length ? directions : [company.segment]).map((direction) => (
              <b key={direction}>{direction}</b>
            ))}
          </div>
        </section>
        <section>
          <span>相似企业</span>
          <div className="similar-company-list">
            {similar.map((item) => (
              <button key={item.id} onClick={() => onOpenSimilar(item.id)} type="button">
                <b>{companyName(item.company)}</b>
                <small>{item.venue} · {item.booth}</small>
              </button>
            ))}
          </div>
        </section>

        <div className="explore-detail-actions">
          <button
            className={interested ? "saved" : ""}
            onClick={() => onToggleInterest(company.id)}
            type="button"
          >
            {interested ? "✓ 已感兴趣" : "☆ 感兴趣"}
          </button>
          <button className="primary" onClick={() => onPlanFor(company.id)} type="button">
            判断是否适合我
          </button>
        </div>
      </article>
    </div>
  );
}
