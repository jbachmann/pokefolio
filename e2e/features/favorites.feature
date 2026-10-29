Feature: Save favorite Pokémon
  Background:
    Given I open Pokéfolio with no saved application data

  @FAV-001
  Scenario: View an empty favorites collection
    When I show only favorites
    Then no Pokémon match
    When I turn off the favorites filter
    Then the initial collection is shown again

  @FAV-002 @smoke
  Scenario: Keep favorites consistent across screens and restarts
    When I favorite Bulbasaur from its card
    And I open its details
    Then Bulbasaur is marked as a favorite
    When I restart the app without clearing its data
    And I show only favorites
    Then Bulbasaur is the only result
    When I open Bulbasaur and remove its favorite status
    And I restart the app without clearing its data
    And I show only favorites
    Then no Pokémon match
