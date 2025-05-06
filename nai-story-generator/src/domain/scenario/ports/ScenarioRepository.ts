import { Scenario, ScenarioSummary } from '../entities';

export interface ScenarioRepository {
  saveScenario(scenario: Scenario): Promise<void>;
  getScenario(id: string): Promise<Scenario | null>;
  getAllScenarios(): Promise<Scenario[]>;
  deleteScenario(id: string): Promise<void>;
  getLastOpenedScenario(): Promise<Scenario | null>;
}
