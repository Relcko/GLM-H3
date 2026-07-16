# Relcko V3.0.0 Application Map

Status: Official application and screen-to-package mapping for Relcko frontend architecture.

## 1. Application estate

| Application | Primary purpose | Primary users |
|-------------|-----------------|---------------|
| Public Website | Acquisition, education, trust building, top-of-funnel conversion | Anonymous visitors, prospective investors, prospective agents, media, partners |
| Investor Portal | Ownership lifecycle, investing, portfolio intelligence, governance, AI assistance | Retail investors, accredited investors, institutional representatives |
| Agent Portal | Referral, customer, commission, performance, sales enablement | Agents, senior agents, network leaders |
| Administration Portal | Platform oversight, compliance, operations, orchestration, emergency control | Administrators, compliance officers, treasury managers, governance managers, executives |
| Mobile Application | Mobile-first investor and agent workflows, lightweight executive visibility | Investors, agents, executives |

## 2. Public Website

| Screen / area | Primary package mapping | Supporting packages |
|---------------|-------------------------|---------------------|
| Landing | `@relcko/marketplace` | `@relcko/performance`, `@relcko/feature-flags` |
| Marketplace | `@relcko/marketplace` | `@relcko/identity`, `@relcko/portfolio` |
| Property details | `@relcko/marketplace` | `@relcko/investment-engine`, `@relcko/identity`, `@relcko/security` |
| Presale | `@relcko/marketplace` | `@relcko/identity`, `@relcko/feature-flags` |
| About | no business package ownership | `@relcko/feature-flags` |
| Blog | no business package ownership | `@relcko/performance` |
| Support | `@relcko/identity` | `@relcko/security` |
| Contact | `@relcko/identity` | `@relcko/security` |

## 3. Investor Portal

| Screen / area | Primary package mapping | Supporting packages |
|---------------|-------------------------|---------------------|
| Dashboard | `@relcko/portfolio` | `@relcko/marketplace`, `@relcko/governance`, `@relcko/treasury`, `@relcko/ai-platform`, `@relcko/events` |
| Portfolio | `@relcko/portfolio` | `@relcko/treasury`, `@relcko/nft-marketplace` |
| Marketplace | `@relcko/marketplace` | `@relcko/identity`, `@relcko/investment-engine` |
| Property details | `@relcko/marketplace` | `@relcko/investment-engine`, `@relcko/identity`, `@relcko/security` |
| Investments | `@relcko/investment-engine` | `@relcko/marketplace`, `@relcko/portfolio` |
| NFTs | `@relcko/nft-marketplace` | `@relcko/portfolio`, `@relcko/identity` |
| Governance | `@relcko/governance` | `@relcko/portfolio`, `@relcko/identity` |
| Treasury history | `@relcko/treasury` | `@relcko/portfolio` |
| AI Advisor | `@relcko/ai-platform` | `@relcko/portfolio`, `@relcko/marketplace`, `@relcko/governance`, `@relcko/treasury` |
| Documents | `@relcko/identity` | `@relcko/security` |
| Notifications | `@relcko/events` | `@relcko/identity`, `@relcko/operations` |
| Wallet | `@relcko/identity` | `@relcko/security`, `@relcko/governance`, `@relcko/nft-marketplace` |
| Settings | `@relcko/identity` | `@relcko/security`, `@relcko/permission` |

## 4. Agent Portal

| Screen / area | Primary package mapping | Supporting packages |
|---------------|-------------------------|---------------------|
| Dashboard | `@relcko/network-engine` | `@relcko/portfolio`, `@relcko/treasury`, `@relcko/ai-platform` |
| Customers | `@relcko/network-engine` | `@relcko/identity`, `@relcko/permission` |
| Leads | `@relcko/network-engine` | `@relcko/identity` |
| Referral network | `@relcko/network-engine` | `@relcko/permission` |
| Commissions | `@relcko/network-engine` | `@relcko/treasury` |
| Performance | `@relcko/network-engine` | `@relcko/performance` |
| Rewards | `@relcko/network-engine` | `@relcko/treasury` |
| Leaderboard | `@relcko/network-engine` | `@relcko/performance` |
| AI Sales Assistant | `@relcko/ai-platform` | `@relcko/network-engine`, `@relcko/identity` |
| Documents | `@relcko/identity` | `@relcko/security` |
| Settings | `@relcko/identity` | `@relcko/security`, `@relcko/permission` |

## 5. Administration Portal

| Screen / area | Primary package mapping | Supporting packages |
|---------------|-------------------------|---------------------|
| Executive dashboard | `@relcko/administration` | `@relcko/operations`, `@relcko/performance`, `@relcko/portfolio`, `@relcko/treasury` |
| Users | `@relcko/administration` | `@relcko/identity`, `@relcko/permission`, `@relcko/security` |
| Properties | `@relcko/administration` | `@relcko/marketplace` |
| Marketplace | `@relcko/administration` | `@relcko/marketplace`, `@relcko/investment-engine` |
| Treasury | `@relcko/administration` | `@relcko/treasury`, `@relcko/security`, `@relcko/permission` |
| Governance | `@relcko/administration` | `@relcko/governance`, `@relcko/permission` |
| Compliance | `@relcko/administration` | `@relcko/security`, `@relcko/identity` |
| KYC / AML | `@relcko/administration` | `@relcko/identity`, `@relcko/security` |
| Operations | `@relcko/operations` | `@relcko/performance`, `@relcko/events` |
| Monitoring | `@relcko/operations` | `@relcko/performance` |
| AI Control Center | `@relcko/administration` | `@relcko/ai-platform`, `@relcko/security` |
| Audit logs | `@relcko/administration` | `@relcko/events`, `@relcko/security` |
| Feature flags | `@relcko/administration` | `@relcko/feature-flags` |
| Emergency controls | `@relcko/administration` | `@relcko/security`, `@relcko/permission`, `@relcko/operations` |
| System configuration | `@relcko/administration` | `@relcko/security`, `@relcko/feature-flags` |

## 6. Mobile application

| Screen / area | Primary package mapping | Supporting packages |
|---------------|-------------------------|---------------------|
| Investor home | `@relcko/portfolio` | `@relcko/marketplace`, `@relcko/treasury`, `@relcko/ai-platform` |
| Investor marketplace | `@relcko/marketplace` | `@relcko/investment-engine`, `@relcko/identity` |
| Investor investments | `@relcko/investment-engine` | `@relcko/portfolio` |
| Investor governance | `@relcko/governance` | `@relcko/identity` |
| Investor wallet | `@relcko/identity` | `@relcko/security` |
| Agent home | `@relcko/network-engine` | `@relcko/ai-platform`, `@relcko/treasury` |
| Agent leads | `@relcko/network-engine` | `@relcko/identity` |
| Agent commissions | `@relcko/network-engine` | `@relcko/treasury` |
| Agent leaderboard | `@relcko/network-engine` | `@relcko/performance` |
| Executive snapshot | `@relcko/administration` | `@relcko/operations`, `@relcko/performance`, `@relcko/treasury` |

## 7. Shared platform mappings

| Capability | Package mapping |
|------------|-----------------|
| Authentication | `@relcko/identity` |
| Session and device security | `@relcko/security` |
| Capability and scope rendering | `@relcko/permission` |
| Event-driven notifications | `@relcko/events` |
| Operations health and telemetry | `@relcko/operations`, `@relcko/performance` |
| AI explainability and policy-constrained advisory | `@relcko/ai-platform` |

## 8. Mapping rules

- Every screen has exactly one primary domain owner.
- Cross-domain composition is allowed only as read-model consumption or orchestrated UI composition.
- Business rules remain owned by the mapped backend/domain package.
- Frontend-specific workflow convenience must never become an alternate source of truth.
