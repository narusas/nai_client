import { Scenario, ScenarioSummary } from '../entities';

/**
 * 시나리오 데이터 저장소 인터페이스
 * 시나리오 데이터의 저장, 조회, 삭제 기능을 정의
 */
export interface ScenarioRepository {
  /**
   * 시나리오 데이터 저장
   * @param scenario 저장할 시나리오 객체
   */
  saveScenario(scenario: Scenario): Promise<void>;

  /**
   * 특정 ID의 시나리오 조회
   * @param id 조회할 시나리오 ID
   * @returns 시나리오 객체 또는 없을 경우 null
   */
  getScenario(id: string): Promise<Scenario | null>;

  /**
   * 모든 시나리오 목록 조회
   * @returns 시나리오 객체 목록
   */
  getAllScenarios(): Promise<Scenario[]>;

  /**
   * 특정 ID의 시나리오 삭제
   * @param id 삭제할 시나리오 ID
   */
  deleteScenario(id: string): Promise<void>;

  /**
   * 가장 최근에 열린 시나리오 조회
   * @returns 최근에 열린 시나리오 객체 또는 없을 경우 null
   */
  getLastOpenedScenario(): Promise<Scenario | null>;
}
