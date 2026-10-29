Feature: Explore Pokémon details
  Background:
    Given I open Pokéfolio with no saved application data

  @DETAIL-001 @network @smoke
  Scenario: Read a Pokémon's field guide
    When I open Bulbasaur
    Then I see its number, Grass and Poison types, height, and weight
    And I see its abilities and English field notes
    And its six base stats total 318
    And its weaknesses include Fire, Ice, Flying, and Psychic
    When I return to the Pokédex
    Then I can browse Pokémon again

  @DETAIL-002 @network
  Scenario: Follow an evolution family
    When I open Bulbasaur's evolution family
    Then Ivysaur requires level 16
    And Venusaur requires level 32
    When I select Ivysaur in the family
    Then Ivysaur's details are shown

  # Manual reason: iOS Maestro cannot disable simulator networking; see e2e/README.md.
  @MANUAL-002 @manual @network
  Scenario: Retry opening uncached Pokémon details
    Given application data is cleared and PokéAPI access is blocked
    When I open "pokefolio://pokemon/25"
    Then I see a detail-loading failure and a retry action
    When PokéAPI access is restored and I retry
    Then Pikachu's details load

  # Manual reason: iOS Maestro cannot disable simulator networking; see e2e/README.md.
  @MANUAL-003 @manual @network
  Scenario: Retain bundled details while evolution loading fails
    Given application data is cleared and PokéAPI access is blocked
    When I open Bulbasaur
    Then its bundled stats remain available
    And I see an evolution-loading failure
    When PokéAPI access is restored and I retry evolution loading
    Then its evolution family loads
