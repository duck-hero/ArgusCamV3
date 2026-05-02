using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ArgusCam.Infrastructure.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddCameraHardwareFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DeviceType",
                table: "Cameras",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Model",
                table: "Cameras",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SDKPort",
                table: "Cameras",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SerialNo",
                table: "Cameras",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SoftwareVersion",
                table: "Cameras",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeviceType",
                table: "Cameras");

            migrationBuilder.DropColumn(
                name: "Model",
                table: "Cameras");

            migrationBuilder.DropColumn(
                name: "SDKPort",
                table: "Cameras");

            migrationBuilder.DropColumn(
                name: "SerialNo",
                table: "Cameras");

            migrationBuilder.DropColumn(
                name: "SoftwareVersion",
                table: "Cameras");
        }
    }
}
