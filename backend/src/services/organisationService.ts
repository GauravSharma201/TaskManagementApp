import Organisation from '../models/organisationModel';
import OrganisationMember from '../models/organisationMembersModel';

class OrganisationService {
  static async getOrganisationById(id: number) {
    const resp = await Organisation.findByPk(id);
    return resp;
  }

  static async addUserToOrganisation(organisationId: number, userId: number) {
    const organisationResp = await Organisation.findByPk(organisationId);
    if (!organisationResp) return null;
    const resp = await OrganisationMember.create({
      organisationId,
      userId
    });
    return resp;
  }
}

export default OrganisationService;
