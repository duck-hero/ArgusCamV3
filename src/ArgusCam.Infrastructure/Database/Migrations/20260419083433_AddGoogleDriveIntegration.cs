using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ArgusCam.Infrastructure.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddGoogleDriveIntegration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DriveFileId",
                table: "Videos",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DriveSyncedAt",
                table: "Videos",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DriveWebViewLink",
                table: "Videos",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "GoogleDriveAccounts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Email = table.Column<string>(type: "TEXT", nullable: false),
                    RefreshToken = table.Column<string>(type: "TEXT", nullable: false),
                    AccessToken = table.Column<string>(type: "TEXT", nullable: true),
                    AccessTokenExpiresAt = table.Column<string>(type: "TEXT", nullable: true),
                    FolderId = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedBy = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedOn = table.Column<string>(type: "TEXT", nullable: false),
                    LastModifiedBy = table.Column<string>(type: "TEXT", nullable: true),
                    LastModifiedOn = table.Column<string>(type: "TEXT", nullable: false),
                    IsDeleted = table.Column<bool>(type: "INTEGER", nullable: false),
                    DeletedOn = table.Column<string>(type: "TEXT", nullable: true),
                    DeletedBy = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GoogleDriveAccounts", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GoogleDriveAccounts");

            migrationBuilder.DropColumn(
                name: "DriveFileId",
                table: "Videos");

            migrationBuilder.DropColumn(
                name: "DriveSyncedAt",
                table: "Videos");

            migrationBuilder.DropColumn(
                name: "DriveWebViewLink",
                table: "Videos");
        }
    }
}
