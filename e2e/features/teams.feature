Feature: Build and understand teams
  Background:
    Given I open Pokéfolio with no saved application data

  @TEAM-001
  Scenario: Create a team from the empty collection
    When I open My teams
    Then I see the first-team invitation
    When I start creating a team
    And I enter a whitespace-only name
    Then creating the team is disabled
    When I enter "  Evergreen Six  " and create the team
    Then the selected team is named "Evergreen Six"
    And it has no partners or populated analysis

  @TEAM-002 @smoke
  Scenario: Create a team while choosing a Pokémon
    When I choose to add Bulbasaur from its card
    And I create "Trail Friends" in the team picker
    And I open My teams
    Then Trail Friends contains Bulbasaur as its only partner

  @TEAM-003
  Scenario: Add a Pokémon from details to an existing team
    Given I have an empty team named "Trail Friends"
    When I open Charmander's details
    And I add Charmander to Trail Friends
    Then Trail Friends contains Charmander as its only partner

  @TEAM-004
  Scenario: Rename and retain a saved team
    Given Trail Friends contains Bulbasaur and Charmander
    When I rename the team to "Forest Friends"
    And I restart the app without clearing its data
    Then Forest Friends still contains Bulbasaur and Charmander
    And the old team name is absent

  @TEAM-005
  Scenario: Keep separate teams independent
    Given I have two teams with different partners
    When I switch between the teams
    Then each team shows its own roster
    When I remove a partner from one team
    Then the other team's roster is unchanged

  @TEAM-006
  Scenario: Reject a duplicate partner
    Given Trail Friends contains Bulbasaur
    When I try to add Bulbasaur to Trail Friends again
    Then the picker explains that Bulbasaur is already on the team
    And the team still has exactly one partner

  @TEAM-007
  Scenario: Enforce six partners and reuse an available slot
    Given Trail Friends contains Bulbasaur, Charmander, Squirtle, Caterpie, Weedle, and Pidgey
    When I try to add Rattata
    Then the picker explains that the team is full
    And the roster is unchanged
    When I remove Pidgey and add Rattata
    Then the team contains six unique partners including Rattata
    When I restart the app without clearing its data
    Then the updated roster is retained

  @TEAM-008
  Scenario: Remove the last partner
    Given Trail Friends contains only Bulbasaur
    When I remove Bulbasaur
    Then the team remains with no partners
    And the empty-analysis invitation replaces the populated analysis

  @TEAM-009
  Scenario: Cancel and confirm team deletion
    Given I have one saved team
    When I request deletion and choose to keep my team
    Then the team remains
    When I request deletion and confirm
    Then I see the first-team invitation
    When I restart the app without clearing its data
    Then the deleted team remains absent

  @TEAM-010
  Scenario: Read defensive and offensive analysis
    Given my team contains only Charizard
    Then its base stat total is 534
    And its defensive matchups show Rock at 4 times damage
    And Grass at one quarter damage
    And Ground at zero damage
    When I switch to offensive analysis
    Then Grass shows 2 times damage
    When I remove Charizard
    Then the populated analysis is replaced by the empty-team invitation
