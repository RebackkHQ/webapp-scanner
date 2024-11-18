---
layout: default
title: Sentinel by Rebackk | Scoring System
---

# Sentinel Vulnerability Scoring System

The Sentinel vulnerability scoring system is built to help security analysts and engineers understand the severity of potential vulnerabilities within their systems. By leveraging the Common Vulnerability Scoring System (CVSS) standards, our system calculates a score between **0.1** and **10.0**, categorizing vulnerabilities into different severity levels. This ensures that organizations can prioritize their remediation efforts effectively.

## Understanding the CVSS Score

The **CVSS score** is generated based on multiple factors such as attack vector, access complexity, privileges required, and user interaction. Our scoring function uses CVSS v3.1 guidelines to provide a reliable assessment. The scoring mechanism is as follows:

### CVSS Metrics

- **Access Vector (AV)**:
  - `N` (Network): The attacker can exploit the vulnerability remotely.
  - `A` (Adjacent): The attacker needs to be on the same network segment as the target.
  - `L` (Local): The attacker requires local access to the target.
  - `P` (Physical): The attacker needs physical access to the system.

- **Access Complexity (AC)**:
  - `L` (Low): The attack does not require special conditions.
  - `H` (High): The attack requires special conditions or circumstances.

- **Privileges Required (PR)**:
  - `N` (None): The attacker does not need any privileges.
  - `L` (Low): The attacker needs basic user privileges.
  - `H` (High): The attacker needs elevated privileges.

- **User Interaction (UI)**:
  - `N` (None): No user interaction is needed.
  - `P` (Passive): User interaction is necessary but the attack is passive.
  - `A` (Active): Active user interaction is required.

- **Scope (S)**:
  - `N` (None): No impact beyond the vulnerable system.
  - `C` (Changed): Exploitation of the vulnerability can affect other systems.

- **Confidentiality Impact (C)**:
  - `N` (None): No impact on confidentiality.
  - `L` (Low): Partial impact on confidentiality.
  - `H` (High): Complete impact on confidentiality.

- **Integrity Impact (I)**:
  - `N` (None): No impact on integrity.
  - `L` (Low): Partial impact on integrity.
  - `H` (High): Complete impact on integrity.

- **Availability Impact (A)**:
  - `N` (None): No impact on availability.
  - `L` (Low): Partial impact on availability.
  - `H` (High): Complete impact on availability.

## Severity Levels

Sentinel uses the following classification based on the CVSS score to determine the severity level:

| **CVSS v3 Score Range** | **Severity Level** |
|-------------------------|--------------------|
| **0.1 - 3.9**           | Low                |
| **4.0 - 6.9**           | Medium             |
| **7.0 - 8.9**           | High               |
| **9.0 - 10.0**          | Critical           |
| **0.0**                 | Info               |

## Detailed Definitions of Severity Levels

### Critical
- **Score**: 9.0 - 10.0
- **Description**: Vulnerabilities classified as critical are likely to result in a complete compromise of servers or infrastructure. These attacks are typically straightforward, requiring no special privileges, authentication, or social engineering. Exploitation often results in root-level access or control over infrastructure components.

### High
- **Score**: 7.0 - 8.9
- **Description**: These vulnerabilities allow attackers to compromise the confidentiality, integrity, or availability of the system. No specialized access or user interaction is needed, and exploitation may lead to lateral movement within the network. Though difficult to exploit, successful attacks can result in significant data breaches or elevated privileges.

### Medium
- **Score**: 4.0 - 6.9
- **Description**: Medium-severity vulnerabilities require some level of specialized access or user interaction. Exploitation may provide partial access to systems or be used in conjunction with other vulnerabilities to escalate attacks. These vulnerabilities often require social engineering or presence on the same local network.

### Low
- **Score**: 0.1 - 3.9
- **Description**: Low-severity vulnerabilities present limited risk to confidentiality, integrity, or availability. Successful exploitation may require complex conditions, specialized access, or chaining with other vulnerabilities. Typically, these are not critical to immediate operations but should be addressed over time.

### Info
- **Score**: 0.0
- **Description**: These are not true vulnerabilities but may indicate potential weaknesses. They provide information that could be used in future attacks, such as system configuration details or application behaviors. It's recommended to minimize information disclosure wherever possible.

## Conclusion

Understanding the severity of vulnerabilities is essential to protecting your systems. The Sentinel Scoring System provides a robust way to assess risks and prioritize remediation efforts, helping you focus on what matters most to your organization's security.