/**
 * TCA Templates — Pre-built graphs for instant analysis.
 * 6 templates modeling real systems with honest edge types.
 */

import { EdgeType } from "./types";
import { TopologicalGraph } from "./graph";

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
}

export const TEMPLATES: TemplateInfo[] = [
  { id: "economics", name: "Global Economics", description: "Central banks, inflation, employment, trade. 15 nodes, 23 edges." },
  { id: "tanakh", name: "Tanakh (Hebrew Bible)", description: "HaShem, covenant, exile, return. 14 nodes, 18 edges." },
  { id: "us_geopolitics", name: "US Geopolitics", description: "Military, dollar, tech, rivals. 13 nodes, 16 edges." },
  { id: "china_geopolitics", name: "China Geopolitics", description: "CCP, Belt & Road, Taiwan, demographics. 12 nodes, 17 edges." },
  { id: "apple", name: "Apple Inc.", description: "Hardware, software, services, walled garden. 12 nodes, 17 edges." },
  { id: "openai", name: "OpenAI", description: "GPT, Microsoft, safety, AGI mission. 12 nodes, 18 edges." },
];

export function applyTemplate(g: TopologicalGraph, name: string): void {
  const builders: Record<string, (g: TopologicalGraph) => void> = {
    economics: buildEconomics,
    tanakh: buildTanakh,
    us_geopolitics: buildUSGeopolitics,
    china_geopolitics: buildChinaGeopolitics,
    apple: buildApple,
    openai: buildOpenAI,
  };
  const builder = builders[name];
  if (!builder) throw new Error(`Unknown template: ${name}. Available: ${TEMPLATES.map(t => t.id).join(", ")}`);
  builder(g);
}

function buildEconomics(g: TopologicalGraph) {
  g.addNode("Central Banks", "central_banks");
  g.addNode("Interest Rates", "interest_rates");
  g.addNode("Inflation", "inflation");
  g.addNode("Employment", "employment");
  g.addNode("GDP Growth", "gdp_growth");
  g.addNode("Consumer Spending", "consumer_spending");
  g.addNode("Government Debt", "gov_debt");
  g.addNode("Trade Balance", "trade_balance");
  g.addNode("Currency Value", "currency");
  g.addNode("Stock Market", "stock_market");
  g.addNode("Housing Market", "housing");
  g.addNode("Wealth Inequality", "inequality");
  g.addNode("Technological Innovation", "tech_innovation");
  g.addNode("Supply Chains", "supply_chains");
  g.addNode("Energy Prices", "energy");

  g.addEdge("central_banks", "interest_rates", EdgeType.BOUNDS, 0.9);
  g.addEdge("interest_rates", "inflation", EdgeType.REMOVES, 0.8);
  g.addEdge("interest_rates", "housing", EdgeType.BOUNDS, 0.7);
  g.addEdge("inflation", "consumer_spending", EdgeType.REMOVES, 0.6);
  g.addEdge("inflation", "currency", EdgeType.REMOVES, 0.5);
  g.addEdge("employment", "consumer_spending", EdgeType.EXPRESSES, 0.8);
  g.addEdge("consumer_spending", "gdp_growth", EdgeType.EXPRESSES, 0.9);
  g.addEdge("gdp_growth", "employment", EdgeType.EXPRESSES, 0.7);
  g.addEdge("gdp_growth", "stock_market", EdgeType.MIRRORS, 0.6);
  g.addEdge("gov_debt", "interest_rates", EdgeType.SEEKS, 0.5);
  g.addEdge("gov_debt", "gdp_growth", EdgeType.REMOVES, 0.4);
  g.addEdge("trade_balance", "currency", EdgeType.EXPRESSES, 0.6);
  g.addEdge("trade_balance", "gdp_growth", EdgeType.EXPRESSES, 0.5);
  g.addEdge("currency", "trade_balance", EdgeType.BOUNDS, 0.5);
  g.addEdge("stock_market", "consumer_spending", EdgeType.EXPRESSES, 0.4);
  g.addEdge("housing", "consumer_spending", EdgeType.EXPRESSES, 0.5);
  g.addEdge("inequality", "consumer_spending", EdgeType.REMOVES, 0.6);
  g.addEdge("inequality", "gdp_growth", EdgeType.SEEKS, 0.3);
  g.addEdge("tech_innovation", "gdp_growth", EdgeType.EXPRESSES, 0.7);
  g.addEdge("tech_innovation", "employment", EdgeType.REMOVES, 0.4);
  g.addEdge("supply_chains", "inflation", EdgeType.EXPRESSES, 0.6);
  g.addEdge("energy", "inflation", EdgeType.EXPRESSES, 0.7);
  g.addEdge("energy", "supply_chains", EdgeType.BOUNDS, 0.5);
}

function buildTanakh(g: TopologicalGraph) {
  g.addNode("HaShem (The Name)", "hashem");
  g.addNode("Torah (Law)", "torah");
  g.addNode("Covenant", "covenant");
  g.addNode("Israel (People)", "israel");
  g.addNode("Temple", "temple");
  g.addNode("Prophets", "prophets");
  g.addNode("Exile", "exile");
  g.addNode("Return", "return");
  g.addNode("Justice (Mishpat)", "justice");
  g.addNode("Mercy (Chesed)", "mercy");
  g.addNode("Idolatry", "idolatry");
  g.addNode("Repentance (Teshuvah)", "teshuvah");
  g.addNode("Wisdom (Chokmah)", "wisdom");
  g.addNode("Creation", "creation");

  g.addEdge("hashem", "torah", EdgeType.EXPRESSES, 1.0);
  g.addEdge("hashem", "covenant", EdgeType.BOUNDS, 0.9);
  g.addEdge("hashem", "creation", EdgeType.EXPRESSES, 1.0);
  g.addEdge("torah", "israel", EdgeType.BOUNDS, 0.9);
  g.addEdge("covenant", "israel", EdgeType.BOUNDS, 0.8);
  g.addEdge("israel", "temple", EdgeType.EXPRESSES, 0.7);
  g.addEdge("prophets", "israel", EdgeType.VERIFIES, 0.8);
  g.addEdge("prophets", "justice", EdgeType.EXPRESSES, 0.9);
  g.addEdge("idolatry", "covenant", EdgeType.REMOVES, 0.9);
  g.addEdge("idolatry", "exile", EdgeType.EXPRESSES, 0.8);
  g.addEdge("exile", "return", EdgeType.SEEKS, 0.7);
  g.addEdge("teshuvah", "return", EdgeType.EXPRESSES, 0.8);
  g.addEdge("teshuvah", "covenant", EdgeType.VERIFIES, 0.7);
  g.addEdge("justice", "mercy", EdgeType.MIRRORS, 0.6);
  g.addEdge("justice", "torah", EdgeType.INHERITS, 0.8);
  g.addEdge("mercy", "hashem", EdgeType.INHERITS, 0.9);
  g.addEdge("wisdom", "torah", EdgeType.MIRRORS, 0.7);
  g.addEdge("wisdom", "creation", EdgeType.VERIFIES, 0.6);
}

function buildUSGeopolitics(g: TopologicalGraph) {
  g.addNode("US Military", "us_military");
  g.addNode("US Dollar (Reserve Currency)", "usd");
  g.addNode("Tech Giants", "tech_giants");
  g.addNode("NATO Alliance", "nato");
  g.addNode("China (Rival)", "china");
  g.addNode("Russia (Adversary)", "russia");
  g.addNode("Middle East Oil", "mideast_oil");
  g.addNode("Domestic Polarization", "polarization");
  g.addNode("Immigration", "immigration");
  g.addNode("National Debt", "national_debt");
  g.addNode("AI Supremacy Race", "ai_race");
  g.addNode("Semiconductor Supply", "semiconductors");
  g.addNode("Energy Independence", "energy_indep");

  g.addEdge("us_military", "nato", EdgeType.EXPRESSES, 0.9);
  g.addEdge("us_military", "usd", EdgeType.VERIFIES, 0.7);
  g.addEdge("usd", "national_debt", EdgeType.SEEKS, 0.6);
  g.addEdge("tech_giants", "ai_race", EdgeType.EXPRESSES, 0.8);
  g.addEdge("tech_giants", "semiconductors", EdgeType.SEEKS, 0.7);
  g.addEdge("china", "us_military", EdgeType.REMOVES, 0.6);
  g.addEdge("china", "semiconductors", EdgeType.SEEKS, 0.8);
  g.addEdge("china", "ai_race", EdgeType.REMOVES, 0.7);
  g.addEdge("russia", "nato", EdgeType.REMOVES, 0.8);
  g.addEdge("russia", "energy_indep", EdgeType.REMOVES, 0.5);
  g.addEdge("mideast_oil", "energy_indep", EdgeType.BOUNDS, 0.6);
  g.addEdge("polarization", "nato", EdgeType.REMOVES, 0.4);
  g.addEdge("polarization", "immigration", EdgeType.MIRRORS, 0.5);
  g.addEdge("national_debt", "us_military", EdgeType.BOUNDS, 0.5);
  g.addEdge("semiconductors", "ai_race", EdgeType.BOUNDS, 0.8);
  g.addEdge("energy_indep", "usd", EdgeType.VERIFIES, 0.5);
}

function buildChinaGeopolitics(g: TopologicalGraph) {
  g.addNode("CCP (Party)", "ccp");
  g.addNode("Belt and Road", "bri");
  g.addNode("PLA (Military)", "pla");
  g.addNode("Manufacturing Base", "manufacturing");
  g.addNode("Taiwan Question", "taiwan");
  g.addNode("Demographic Decline", "demographics");
  g.addNode("Tech Self-Sufficiency", "tech_self");
  g.addNode("Yuan Internationalization", "yuan");
  g.addNode("Social Control (Credit)", "social_credit");
  g.addNode("Real Estate Crisis", "real_estate");
  g.addNode("US Containment", "us_containment");
  g.addNode("Resource Security", "resources");

  g.addEdge("ccp", "pla", EdgeType.BOUNDS, 0.9);
  g.addEdge("ccp", "social_credit", EdgeType.EXPRESSES, 0.8);
  g.addEdge("ccp", "bri", EdgeType.EXPRESSES, 0.7);
  g.addEdge("manufacturing", "bri", EdgeType.EXPRESSES, 0.6);
  g.addEdge("manufacturing", "demographics", EdgeType.SEEKS, 0.7);
  g.addEdge("taiwan", "pla", EdgeType.SEEKS, 0.8);
  g.addEdge("taiwan", "tech_self", EdgeType.BOUNDS, 0.9);
  g.addEdge("demographics", "manufacturing", EdgeType.REMOVES, 0.7);
  g.addEdge("demographics", "real_estate", EdgeType.EXPRESSES, 0.6);
  g.addEdge("tech_self", "us_containment", EdgeType.REMOVES, 0.7);
  g.addEdge("us_containment", "taiwan", EdgeType.VERIFIES, 0.6);
  g.addEdge("us_containment", "tech_self", EdgeType.BOUNDS, 0.8);
  g.addEdge("yuan", "bri", EdgeType.INHERITS, 0.5);
  g.addEdge("yuan", "us_containment", EdgeType.SEEKS, 0.4);
  g.addEdge("real_estate", "ccp", EdgeType.SEEKS, 0.6);
  g.addEdge("resources", "bri", EdgeType.INHERITS, 0.6);
  g.addEdge("resources", "manufacturing", EdgeType.BOUNDS, 0.5);
}

function buildApple(g: TopologicalGraph) {
  g.addNode("Hardware Design", "hardware");
  g.addNode("Software Ecosystem", "software");
  g.addNode("Services Revenue", "services");
  g.addNode("Supply Chain (Foxconn)", "supply_chain");
  g.addNode("Brand Premium", "brand");
  g.addNode("Privacy Positioning", "privacy");
  g.addNode("Developer Platform", "developers");
  g.addNode("Chip Design (M-series)", "chips");
  g.addNode("China Market Dependency", "china_market");
  g.addNode("AI Integration", "ai");
  g.addNode("Regulatory Pressure", "regulation");
  g.addNode("Walled Garden", "walled_garden");

  g.addEdge("hardware", "software", EdgeType.MIRRORS, 0.9);
  g.addEdge("hardware", "chips", EdgeType.INHERITS, 0.8);
  g.addEdge("software", "developers", EdgeType.EXPRESSES, 0.8);
  g.addEdge("software", "services", EdgeType.EXPRESSES, 0.7);
  g.addEdge("services", "brand", EdgeType.VERIFIES, 0.6);
  g.addEdge("brand", "hardware", EdgeType.EXPRESSES, 0.7);
  g.addEdge("privacy", "brand", EdgeType.VERIFIES, 0.8);
  g.addEdge("privacy", "ai", EdgeType.REMOVES, 0.5);
  g.addEdge("walled_garden", "developers", EdgeType.BOUNDS, 0.8);
  g.addEdge("walled_garden", "services", EdgeType.EXPRESSES, 0.7);
  g.addEdge("walled_garden", "regulation", EdgeType.SEEKS, 0.6);
  g.addEdge("regulation", "walled_garden", EdgeType.REMOVES, 0.7);
  g.addEdge("supply_chain", "china_market", EdgeType.MIRRORS, 0.6);
  g.addEdge("supply_chain", "hardware", EdgeType.BOUNDS, 0.7);
  g.addEdge("china_market", "services", EdgeType.BOUNDS, 0.5);
  g.addEdge("chips", "ai", EdgeType.EXPRESSES, 0.6);
  g.addEdge("ai", "services", EdgeType.SEEKS, 0.5);
}

function buildOpenAI(g: TopologicalGraph) {
  g.addNode("GPT Models", "gpt");
  g.addNode("Microsoft Partnership", "microsoft");
  g.addNode("API Revenue", "api_revenue");
  g.addNode("ChatGPT Consumer", "chatgpt");
  g.addNode("Safety Team", "safety");
  g.addNode("Compute Costs", "compute");
  g.addNode("AGI Mission", "agi_mission");
  g.addNode("Talent Retention", "talent");
  g.addNode("Open Source Competition", "open_source");
  g.addNode("Regulatory Scrutiny", "regulation");
  g.addNode("Capped Profit Structure", "capped_profit");
  g.addNode("Data Partnerships", "data");

  g.addEdge("gpt", "chatgpt", EdgeType.EXPRESSES, 0.9);
  g.addEdge("gpt", "api_revenue", EdgeType.EXPRESSES, 0.8);
  g.addEdge("gpt", "compute", EdgeType.BOUNDS, 0.8);
  g.addEdge("microsoft", "compute", EdgeType.EXPRESSES, 0.9);
  g.addEdge("microsoft", "api_revenue", EdgeType.VERIFIES, 0.6);
  g.addEdge("chatgpt", "api_revenue", EdgeType.MIRRORS, 0.5);
  g.addEdge("safety", "agi_mission", EdgeType.REMOVES, 0.6);
  g.addEdge("safety", "regulation", EdgeType.MIRRORS, 0.5);
  g.addEdge("agi_mission", "talent", EdgeType.EXPRESSES, 0.7);
  g.addEdge("agi_mission", "capped_profit", EdgeType.REMOVES, 0.6);
  g.addEdge("compute", "api_revenue", EdgeType.REMOVES, 0.5);
  g.addEdge("talent", "open_source", EdgeType.SEEKS, 0.5);
  g.addEdge("open_source", "api_revenue", EdgeType.REMOVES, 0.6);
  g.addEdge("open_source", "gpt", EdgeType.REMOVES, 0.4);
  g.addEdge("regulation", "agi_mission", EdgeType.BOUNDS, 0.5);
  g.addEdge("capped_profit", "microsoft", EdgeType.SEEKS, 0.6);
  g.addEdge("data", "gpt", EdgeType.BOUNDS, 0.7);
  g.addEdge("data", "regulation", EdgeType.SEEKS, 0.5);
}
