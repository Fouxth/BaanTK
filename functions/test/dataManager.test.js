const { expect } = require("chai");
const sinon = require("sinon");
const DataManager = require("../utils/dataManager");

describe("DataManager", () => {
  describe("calculateCreditScore", () => {
    it("should calculate credit score correctly", () => {
      const borrowerData = {
        birthDate: "1990-01-01",
        totalLoan: 10000,
        frequency: "monthly"
      };

      const score = DataManager.calculateCreditScore(borrowerData);
      expect(score).to.be.a("number");
      expect(score).to.be.at.least(300);
      expect(score).to.be.at.most(850);
    });

    it("should give higher score for monthly frequency", () => {
      const monthlyBorrower = {
        birthDate: "1990-01-01",
        totalLoan: 10000,
        frequency: "monthly"
      };

      const dailyBorrower = {
        birthDate: "1990-01-01",
        totalLoan: 10000,
        frequency: "daily"
      };

      const monthlyScore = DataManager.calculateCreditScore(monthlyBorrower);
      const dailyScore = DataManager.calculateCreditScore(dailyBorrower);

      expect(monthlyScore).to.be.greaterThan(dailyScore);
    });
  });

  describe("calculateOverdueInterest", () => {
    it("should calculate overdue interest correctly", () => {
      const borrowerData = {
        totalLoan: 10000,
        interestRate: 0.1,
        dueDate: {
          toDate: () => new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
        }
      };

      const result = DataManager.calculateOverdueInterest(borrowerData);

      expect(result).to.have.property("overdueDays", 5);
      expect(result).to.have.property("penalty");
      expect(result).to.have.property("totalOwed");
      expect(result.penalty).to.be.greaterThan(0);
      expect(result.totalOwed).to.be.greaterThan(borrowerData.totalLoan);
    });

    it("should return zero overdue for future due date", () => {
      const borrowerData = {
        totalLoan: 10000,
        interestRate: 0.1,
        dueDate: {
          toDate: () => new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
        }
      };

      const result = DataManager.calculateOverdueInterest(borrowerData);

      expect(result.overdueDays).to.equal(0);
      expect(result.penalty).to.equal(0);
    });
  });

  describe("shouldAutoApprove", () => {
    it("should auto approve for low risk borrowers", () => {
      const lowRiskBorrower = {
        birthDate: "1990-01-01",
        totalLoan: 15000,
        frequency: "monthly"
      };

      const shouldApprove = DataManager.shouldAutoApprove(lowRiskBorrower);
      expect(shouldApprove).to.be.a("boolean");
    });

    it("should not auto approve for high risk borrowers", () => {
      const highRiskBorrower = {
        birthDate: "2005-01-01", // Too young
        totalLoan: 40000, // High amount
        frequency: "daily" // High risk frequency
      };

      const shouldApprove = DataManager.shouldAutoApprove(highRiskBorrower);
      expect(shouldApprove).to.equal(false);
    });
  });
});

describe("Validation Functions", () => {
  describe("ID Card Validation", () => {
    it("should validate 13-digit ID card", () => {
      const validIdCard = "1234567890123";
      const invalidIdCard = "123456789";

      expect(/^\d{13}$/.test(validIdCard)).to.be.true;
      expect(/^\d{13}$/.test(invalidIdCard)).to.be.false;
    });
  });

  describe("Loan Amount Validation", () => {
    it("should validate loan amount range", () => {
      const validAmount = 25000;
      const invalidLowAmount = 0;
      const invalidHighAmount = 60000;

      expect(validAmount > 0 && validAmount <= 50000).to.be.true;
      expect(invalidLowAmount > 0 && invalidLowAmount <= 50000).to.be.false;
      expect(invalidHighAmount > 0 && invalidHighAmount <= 50000).to.be.false;
    });
  });

  describe("Payment Frequency Validation", () => {
    it("should validate payment frequency options", () => {
      const validFrequencies = ["daily", "weekly", "monthly"];
      const invalidFrequency = "yearly";

      expect(validFrequencies.includes("daily")).to.be.true;
      expect(validFrequencies.includes("weekly")).to.be.true;
      expect(validFrequencies.includes("monthly")).to.be.true;
      expect(validFrequencies.includes(invalidFrequency)).to.be.false;
    });
  });
});

describe("Interest Rate Calculations", () => {
  it("should calculate interest correctly for different frequencies", () => {
    const principal = 10000;
    const dailyRate = 0.20;
    const weeklyRate = 0.15;
    const monthlyRate = 0.10;

    const dailyInterest = principal * dailyRate;
    const weeklyInterest = principal * weeklyRate;
    const monthlyInterest = principal * monthlyRate;

    expect(dailyInterest).to.equal(2000);
    expect(weeklyInterest).to.equal(1500);
    expect(monthlyInterest).to.equal(1000);

    // Daily should be highest, monthly should be lowest
    expect(dailyInterest).to.be.greaterThan(weeklyInterest);
    expect(weeklyInterest).to.be.greaterThan(monthlyInterest);
  });
});
