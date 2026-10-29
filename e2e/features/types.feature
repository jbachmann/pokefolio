Feature: Explore type matchups
  Background:
    Given I open Pokéfolio with no saved application data

  @TYPE-001 @smoke
  Scenario: Explore strengths, weaknesses, and immunities
    When I open the type chart and select Fire
    Then its strengths are Grass, Ice, Bug, and Steel
    And its weaknesses are Water, Ground, and Rock
    When I select Ground
    Then its immunities include Electric

  @TYPE-002
  Scenario: Read the matchup matrix
    When I open the type matchup matrix
    Then Fire against Grass shows double damage
    And Fire against Water shows half damage
    And Fire against Normal shows normal damage
    And Electric against Ground shows zero damage
    When I select Water using a matrix heading
    Then the type summary changes to Water
