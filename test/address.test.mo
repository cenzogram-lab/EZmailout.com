/// Local address checks (src/backend/lib/address.mo), run in the interpreter:
///   moc -r --implicit-package=core --package core <motoko-core>/src test/address.test.mo
import AddressLib "../src/backend/lib/address";
import Common "../src/backend/types/common";
import Runtime "mo:core/Runtime";
import Debug "mo:core/Debug";

func expect(what : Text, ok : Bool) { if (not ok) Runtime.trap("FAILED: " # what) };

func addr(name : Text, line1 : Text, line2 : ?Text, city : Text, state : Text, zip : Text) : Common.AddressInput {
  { name; address_line1 = line1; address_line2 = line2; city; state; zip_code = zip };
};

let good = addr("Jane Rivera", "120 Harbor View Dr", ?"Apt 4B", "Austin", "TX", "78701");

// Name, line 1, optional line 2, city, state and a 5-digit or ZIP+4 code.
expect("a full address passes", AddressLib.validateLocal(good) == null);
expect("line 2 is optional", AddressLib.validateLocal({ good with address_line2 = null }) == null);
expect("ZIP+4 passes", AddressLib.validateLocal({ good with zip_code = "78701-1234" }) == null);

// Each missing or malformed field fails with a message naming it.
expect("no name", AddressLib.validateLocal({ good with name = "" }) == ?"Recipient name is required");
expect("no street", AddressLib.validateLocal({ good with address_line1 = "" }) == ?"Street address is required");
expect("no city", AddressLib.validateLocal({ good with city = "" }) == ?"City is required");
expect("state of 3 letters", AddressLib.validateLocal({ good with state = "TEX" }) == ?"State must be a 2-letter code");
expect("state with a digit", AddressLib.validateLocal({ good with state = "T1" }) == ?"State must be a 2-letter code");
expect("4-digit ZIP", AddressLib.validateLocal({ good with zip_code = "7870" }) == ?"ZIP must be 5 digits or ZIP+4");
expect("ZIP with a letter", AddressLib.validateLocal({ good with zip_code = "7870A" }) == ?"ZIP must be 5 digits or ZIP+4");
expect("ZIP+4 without the dash", AddressLib.validateLocal({ good with zip_code = "787011234" }) == ?"ZIP must be 5 digits or ZIP+4");
expect("ZIP+4 short tail", AddressLib.validateLocal({ good with zip_code = "78701-123" }) == ?"ZIP must be 5 digits or ZIP+4");
let long = "1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890X";
expect("a line over 100 characters", AddressLib.validateLocal({ good with address_line1 = long }) == ?"Address lines are limited to 100 characters");

// ZIP helpers and the verified form.
expect("zip5 of ZIP+4", AddressLib.zip5("78701-1234") == "78701");
expect("zipPlus4Of", AddressLib.zipPlus4Of("78701-1234") == ?"1234" and AddressLib.zipPlus4Of("78701") == null);
let v = AddressLib.toVerified({ good with zip_code = "78701-1234" }, null);
expect("toVerified splits ZIP+4", v.zip_code == "78701" and v.zip_plus4 == ?"1234");
let v2 = AddressLib.toVerified(good, ?"5678");
expect("toVerified takes the CASS ZIP+4", v2.zip_code == "78701" and v2.zip_plus4 == ?"5678");

// Names split for the address list's first/last name columns.
expect("two names", AddressLib.splitName("Jane Rivera") == ("Jane", "Rivera"));
expect("middle initial", AddressLib.splitName("Jane Q Public") == ("Jane", "Q Public"));
expect("one name", AddressLib.splitName("Cher") == ("Cher", ""));

// Paging a stored list.
let list = [v, v2, v, v2, v];
expect("first page", AddressLib.page(list, 0, 2).addresses.size() == 2 and AddressLib.page(list, 0, 2).total == 5);
expect("last page", AddressLib.page(list, 4, 2).addresses.size() == 1);
expect("past the end", AddressLib.page(list, 9, 2).addresses.size() == 0);

// Recipient ids round-trip.
expect("recipient id", AddressLib.recipientId("cmp_12", 7) == "cmp_12_7");
expect("campaign of a recipient id", AddressLib.campaignIdOf("cmp_12_7") == "cmp_12" and AddressLib.campaignIdOf("cmp_12") == "cmp_12");

Debug.print("address: all checks passed");
