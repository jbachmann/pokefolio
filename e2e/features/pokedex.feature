Feature: Explore the Pokédex
  Background:
    Given I open Pokéfolio with no saved application data

  @DEX-001 @smoke
  Scenario: Browse the initial collection
    Then the Pokédex shows the first 24 of 1,025 Pokémon
    And I can open Bulbasaur from its card

  @DEX-002 @smoke
  Scenario: Search by name and Pokédex number
    When I search for " BuLbAsAuR "
    Then Bulbasaur is the only result
    When I replace the search with "#0001"
    Then Bulbasaur is the only result
    When I clear the search
    Then the initial collection is shown again

  @DEX-003
  Scenario: Combine search, type, and generation filters
    When I search for "char"
    And I select Fire and Generation I
    Then the results are Charmander, Charmeleon, and Charizard
    When I select Generation II
    Then no Pokémon match
    When I clear the filters
    Then the initial collection is shown again

  @DEX-004
  Scenario: Sort results and change their presentation
    Given I have selected Generation I and searched for "char"
    When I sort by name from A to Z
    Then the results are ordered Charizard, Charmander, Charmeleon
    When I switch to list view
    Then the same results remain in the same order
    When I sort by highest number first
    Then the results are ordered Charizard, Charmeleon, Charmander
    When I switch to grid view
    Then the results retain that order

  @DEX-005
  Scenario: Recover from an unsuccessful search
    When I search for "not-a-pokemon"
    Then I see the no-results message
    When I clear the filters
    Then Pokémon are visible again

  @DEX-006 @network
  Scenario: Discover another page
    When I request more Pokémon
    Then the displayed result count increases from 24 to 48
    And Pikachu can be opened from its loaded card

  # Manual reason: iOS Maestro cannot disable simulator networking; see e2e/README.md.
  @MANUAL-001 @manual @network
  Scenario: Retry loading an uncached directory result
    Given application data is cleared and PokéAPI access is blocked
    When I search for Pikachu
    Then I see a loading failure and a retry action
    When PokéAPI access is restored and I retry
    Then Pikachu's loaded card becomes available
