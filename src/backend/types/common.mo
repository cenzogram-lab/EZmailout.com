module {
  public type Timestamp = Int;

  // Sanitized address — all text fields are trimmed
  public type AddressInput = {
    name : Text;
    address_line1 : Text;
    address_line2 : ?Text;
    city : Text;
    state : Text;
    zip_code : Text;
  };

  public type VerifiedAddress = {
    name : Text;
    address_line1 : Text;
    address_line2 : ?Text;
    city : Text;
    state : Text;
    zip_code : Text;
    zip_plus4 : ?Text;
  };

  public type AddressVerificationResult = {
    input : AddressInput;
    verified : ?VerifiedAddress;
    isValid : Bool;
    errorMessage : ?Text;
  };

  public type AdminKeys = {
    stripeKey : ?Text;
    lobKey : ?Text;
    resendKey : ?Text;
  };
};
