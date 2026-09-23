/// Support tickets and the Stampy copilot.
module {
  /// A ticket filed from the Stampy support drawer. Stored append-only; the
  /// admin reads them in the Admin panel.
  public type SupportTicket = {
    id : Text;
    /// Principal text of a signed-in submitter; null when signed out.
    userId : ?Text;
    name : Text;
    email : Text;
    subject : Text;
    message : Text;
    /// App route the drawer was opened from, e.g. `/wizard`.
    pagePath : Text;
    createdAt : Int;
  };

  public type SupportTicketInput = {
    name : Text;
    email : Text;
    subject : Text;
    message : Text;
    pagePath : ?Text;
  };

  public type SupportTicketResult = { ok : Bool; error : ?Text; ticketId : ?Text };

  public type StampyRole = { #User; #Assistant };

  /// One message of the conversation the client replays to `askStampy`.
  public type StampyTurn = { role : StampyRole; content : Text };

  public type StampyReply = { ok : Bool; error : ?Text; reply : ?Text };
};
