export const resolveSenderEmail = async (
  graphSettings,
  adSettings,
  req,
  getInfo
) => {
  let senderEmail = graphSettings.senderEmail;
  if (
    graphSettings.useLoggedInUserAsSender &&
    req?.user?.username &&
    adSettings?.enabled &&
    typeof getInfo === 'function'
  ) {
    try {
      const info = await getInfo(adSettings, req.user.username);
      if (info?.mail) {
        senderEmail = info.mail;
      }
    } catch (err) {
      console.error('Failed to fetch sender email from AD:', err);
    }
  }
  return senderEmail;
};
